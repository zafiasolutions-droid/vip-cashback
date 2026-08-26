import db from "../db.server.js";

/**
 * Check whether a customer qualifies
 * through the Spending VIP rule.
 */
function isSpendingVip(customer, spendingRule) {
  if (!spendingRule?.enabled || !customer.spending) {
    return false;
  }

  if (!customer.spending.vipUnlockedAt) {
    return false;
  }

  if (spendingRule.mode === "PERMANENT") {
    return true;
  }

  if (spendingRule.mode === "DYNAMIC") {
    return (
      customer.spending.eligibleAmount >=
      spendingRule.threshold
    );
  }

  return false;
}

/**
 * Check whether a customer is
 * an active Twitch subscriber VIP.
 */
function isTwitchVip(customer) {
  return customer.twitchConnection?.isSubscriber === true;
}

/**
 * Check whether a customer is
 * an active Manual VIP.
 */
function isManualVip(customer) {
  return customer.manualVip?.isActive === true;
}

/**
 * Get the complete VIP status
 * of a customer.
 */
export async function getCustomerVipStatus({
  shopId,
  shopifyCustomerId,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!shopifyCustomerId) {
    throw new Error(
      "Shopify customer ID is required",
    );
  }

  const customerId = String(
    shopifyCustomerId,
  );

  const [customer, spendingRule] =
    await Promise.all([
      db.customer.findFirst({
        where: {
          shopId,
          shopifyCustomerId: {
            endsWith: customerId,
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

console.log("VIP SPENDING DEBUG", {
  customerId: customer?.id,
  spending: customer?.spending,
  spendingRule,
});

  if (!customer) {
    return {
      isVip: false,
      reasons: [],
      customer: null,

      sources: {
        manual: false,
        spending: false,
        twitch: false,
      },
    };
  }

  const manualVip =
    isManualVip(customer);

  const spendingVip =
    isSpendingVip(
      customer,
      spendingRule,
    );

  const twitchVip =
    isTwitchVip(customer);

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
    shopId,
    shopifyCustomerId: customerId,

    localCustomerId: customer.id,

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
 * Simple helper when only true/false
 * VIP status is required.
 */
export async function isCustomerVip({
  shopId,
  shopifyCustomerId,
}) {
  const status =
    await getCustomerVipStatus({
      shopId,
      shopifyCustomerId,
    });

  return status.isVip;
}