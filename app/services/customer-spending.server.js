import db from "../db.server";
import { evaluateCustomerSpendingVip } from "./spending.server";

/**
 * Update a customer's eligible spending amount.
 *
 * This file is responsible for customer spending data.
 * Spending VIP rules are evaluated in spending.server.js.
 */
export async function updateCustomerSpending({
  customerId,
  eligibleAmount,
}) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const amount = Number(eligibleAmount);

  if (Number.isNaN(amount) || amount < 0) {
    throw new Error(
      "Eligible amount must be a valid non-negative number",
    );
  }

  const spending = await db.customerSpending.upsert({
    where: {
      customerId,
    },

    update: {
      eligibleAmount: amount,
      lastCalculatedAt: new Date(),
    },

    create: {
      customerId,
      eligibleAmount: amount,
      lastCalculatedAt: new Date(),
    },
  });

  return spending;
}

/**
 * Get a customer's current eligible spending.
 */
export async function getCustomerSpending(customerId) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  return db.customerSpending.findUnique({
    where: {
      customerId,
    },
  });
}

/**
 * Update customer spending and immediately evaluate
 * their Spending VIP eligibility.
 *
 * This is the main function we will use when Shopify
 * order data changes a customer's spending total.
 */
export async function updateAndEvaluateCustomerSpending({
  customerId,
  shopId,
  eligibleAmount,
}) {
  const spending = await updateCustomerSpending({
    customerId,
    eligibleAmount,
  });

  const vipResult =
    await evaluateCustomerSpendingVip({
      customerId,
      shopId,
    });

  return {
    spending,
    vip: vipResult,
  };
}