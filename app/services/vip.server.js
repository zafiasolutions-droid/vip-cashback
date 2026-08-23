import db from "../db.server";

/**
 * Create or update a customer in our local database.
 */
export async function createOrUpdateCustomer({
  shopId,
  shopifyCustomerId,
  email,
  firstName,
  lastName,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!shopifyCustomerId) {
    throw new Error("Shopify customer ID is required");
  }

  const customer = await db.customer.upsert({
    where: {
      shopId_shopifyCustomerId: {
        shopId,
        shopifyCustomerId: String(shopifyCustomerId),
      },
    },

    update: {
      email: email || null,
      firstName: firstName || null,
      lastName: lastName || null,
    },

    create: {
      shopId,
      shopifyCustomerId: String(shopifyCustomerId),
      email: email || null,
      firstName: firstName || null,
      lastName: lastName || null,
    },
  });

  return customer;
}

/**
 * Give Manual VIP access to a customer.
 *
 * Manual VIP remains active until the merchant removes it.
 */
export async function grantManualVip(customerId) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const manualVip = await db.manualVip.upsert({
    where: {
      customerId,
    },

    update: {
      isActive: true,
    },

    create: {
      customerId,
      isActive: true,
    },
  });

  return manualVip;
}

/**
 * Remove Manual VIP access from a customer.
 *
 * We do not delete the record so the database keeps the history.
 */
export async function revokeManualVip(customerId) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const manualVip = await db.manualVip.findUnique({
    where: {
      customerId,
    },
  });

  if (!manualVip) {
    throw new Error("Manual VIP record not found");
  }

  return db.manualVip.update({
    where: {
      customerId,
    },

    data: {
      isActive: false,
    },
  });
}

/**
 * Get all customers who currently have Manual VIP access.
 */
export async function getManualVipCustomers(shopId) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  return db.customer.findMany({
    where: {
      shopId,

      manualVip: {
        is: {
          isActive: true,
        },
      },
    },

    include: {
      manualVip: true,
    },

    orderBy: {
      updatedAt: "desc",
    },
  });
}

/**
 * Check whether a customer currently has Manual VIP access.
 */
export async function hasManualVip(customerId) {
  if (!customerId) {
    return false;
  }

  const manualVip = await db.manualVip.findUnique({
    where: {
      customerId,
    },
  });

  return manualVip?.isActive === true;
}