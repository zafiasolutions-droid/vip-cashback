import db from "../db.server";
import {
  updateAndEvaluateCustomerSpending,
} from "./customer-spending.server";

/**
 * Sync a Shopify customer into our local database.
 */
export async function syncCustomerFromOrder({
  shopId,
  customer,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!customer?.id) {
    return null;
  }

  return db.customer.upsert({
    where: {
      shopId_shopifyCustomerId: {
        shopId,
        shopifyCustomerId: String(customer.id),
      },
    },

    update: {
      email: customer.email || null,
      firstName: customer.firstName || null,
      lastName: customer.lastName || null,
    },

    create: {
      shopId,
      shopifyCustomerId: String(customer.id),
      email: customer.email || null,
      firstName: customer.firstName || null,
      lastName: customer.lastName || null,
    },
  });
}

/**
 * Save or update a Shopify order spending record.
 *
 * The unique constraint on:
 * shopId + shopifyOrderId
 *
 * prevents duplicate orders from being counted twice.
 */
export async function upsertOrderSpendingRecord({
  shopId,
  customerId,
  shopifyOrderId,
  eligibleAmount,
  currency,
  financialStatus,
  cancelledAt,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  if (!shopifyOrderId) {
    throw new Error("Shopify Order ID is required");
  }

  const amount = Number(eligibleAmount || 0);

  if (Number.isNaN(amount) || amount < 0) {
    throw new Error(
      "Eligible amount must be a valid non-negative number",
    );
  }

  return db.orderSpendingRecord.upsert({
    where: {
      shopId_shopifyOrderId: {
        shopId,
        shopifyOrderId: String(shopifyOrderId),
      },
    },

    update: {
      customerId,
      eligibleAmount: amount,
      currency: currency || null,
      financialStatus: financialStatus || null,
      cancelledAt: cancelledAt
        ? new Date(cancelledAt)
        : null,
    },

    create: {
      shopId,
      customerId,
      shopifyOrderId: String(shopifyOrderId),
      eligibleAmount: amount,
      currency: currency || null,
      financialStatus: financialStatus || null,
      cancelledAt: cancelledAt
        ? new Date(cancelledAt)
        : null,
    },
  });
}

/**
 * Calculate the customer's total eligible spending
 * from all valid order records.
 */
export async function calculateCustomerEligibleSpending({
  shopId,
  customerId,
}) {
  const result = await db.orderSpendingRecord.aggregate({
    where: {
      shopId,
      customerId,

      // Cancelled orders do not count.
      cancelledAt: null,
    },

    _sum: {
      eligibleAmount: true,
    },
  });

  return result._sum.eligibleAmount || 0;
}

/**
 * Process a Shopify order and update the customer's
 * total eligible spending and Spending VIP status.
 */
export async function syncCustomerSpending({
  shopId,
  customer,
  shopifyOrderId,
  eligibleAmount,
  currency,
  financialStatus,
  cancelledAt,
}) {
  const localCustomer = await syncCustomerFromOrder({
    shopId,
    customer,
  });

  // Guest orders cannot qualify for Spending VIP.
  if (!localCustomer) {
    return {
      success: false,
      reason: "NO_CUSTOMER",
    };
  }

  await upsertOrderSpendingRecord({
    shopId,
    customerId: localCustomer.id,
    shopifyOrderId,
    eligibleAmount,
    currency,
    financialStatus,
    cancelledAt,
  });

  // Calculate total from all stored valid orders.
  const totalEligibleAmount =
    await calculateCustomerEligibleSpending({
      shopId,
      customerId: localCustomer.id,
    });

  // Update CustomerSpending and evaluate VIP.
  const result =
    await updateAndEvaluateCustomerSpending({
      customerId: localCustomer.id,
      shopId,
      eligibleAmount: totalEligibleAmount,
    });

  return {
    success: true,

    customer: {
      id: localCustomer.id,
      shopifyCustomerId:
        localCustomer.shopifyCustomerId,
    },

    totalEligibleAmount,

    spending: result.spending,

    vip: result.vip,
  };
}