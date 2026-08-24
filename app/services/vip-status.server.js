import db from "../db.server";

/**
 * Check whether a customer currently qualifies as a Spending VIP.
 */
function isSpendingVip(customer, spendingRule) {
  if (!spendingRule?.enabled || !customer.spending) {
    return false;
  }

  // Customer has never reached the spending threshold.
  if (!customer.spending.vipUnlockedAt) {
    return false;
  }

  // PERMANENT:
  // Once the threshold was reached, VIP remains active.
  if (spendingRule.mode === "PERMANENT") {
    return true;
  }

  // DYNAMIC:
  // Customer must currently remain at or above the threshold.
  if (spendingRule.mode === "DYNAMIC") {
    return (
      customer.spending.eligibleAmount >=
      spendingRule.threshold
    );
  }

  return false;
}

/**
 * Check whether a customer is an active Twitch Subscriber VIP.
 */
function isTwitchVip(customer) {
  return customer.twitchConnection?.isSubscriber === true;
}

/**
 * Check whether a customer is an active Manual VIP.
 */
function isManualVip(customer) {
  return customer.manualVip?.isActive === true;
}

/**
 * Get the complete VIP status of a customer.
 *
 * A customer is VIP if ANY active VIP source qualifies:
 *
 * - Manual VIP
 * - Spending VIP
 * - Twitch Subscriber VIP
 */
export async function getCustomerVipStatus({
  shopId,
  shopifyCustomerId,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!shopifyCustomerId) {
    throw new Error("Shopify customer ID is required");
  }

  const [customer, spendingRule] = await Promise.all([
    db.customer.findUnique({
      where: {
        shopId_shopifyCustomerId: {
          shopId,
          shopifyCustomerId: String(shopifyCustomerId),
        },
      },

      include: {
        manualVip: true,
        spending: true,
        twitchConnection: true,
      },
    }),

    db.spendingRule.findUnique({
      where: {
        shopId,
      },
    }),
  ]);

  // Customer does not exist in our local database yet.
  if (!customer) {
    return {
      isVip: false,
      reasons: [],
      customer: null,
    };
  }

  const manualVip = isManualVip(customer);
  const spendingVip = isSpendingVip(
    customer,
    spendingRule,
  );
  const twitchVip = isTwitchVip(customer);

  const reasons = [];

  if (manualVip) {
    reasons.push("MANUAL");
  }

  if (spendingVip) {
    reasons.push("SPENDING");
  }

  if (twitchVip) {
    reasons.push("TWITCH");
  }

console.log("VIP STATUS CHECK", {
  shopifyCustomerId,
  manualVip,
  spendingVip,
  twitchVip,
  reasons,
});

  return {
    isVip: reasons.length > 0,

    reasons,

    customer: {
      id: customer.id,
      shopifyCustomerId:
        customer.shopifyCustomerId,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
    },

    sources: {
      manual: manualVip,
      spending: spendingVip,
      twitch: twitchVip,
    },
  };
}

/**
 * Simple helper when only true/false is needed.
 */
export async function isCustomerVip({
  shopId,
  shopifyCustomerId,
}) {
  const status = await getCustomerVipStatus({
    shopId,
    shopifyCustomerId,
  });

  return status.isVip;
}