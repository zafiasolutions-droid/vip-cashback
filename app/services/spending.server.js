import db from "../db.server";

/**
 * Get the Spending VIP rule for a shop.
 * If no rule exists, create the default rule.
 */
export async function getSpendingRule(shopId) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  let rule = await db.spendingRule.findUnique({
    where: {
      shopId,
    },
  });

  if (!rule) {
    rule = await db.spendingRule.create({
      data: {
        shopId,
        enabled: false,
        threshold: 0,
        mode: "PERMANENT",
      },
    });
  }

  return rule;
}

/**
 * Update Spending VIP settings for a shop.
 */
export async function updateSpendingRule({
  shopId,
  enabled,
  threshold,
  mode,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  const spendingThreshold = Number(threshold);

  if (Number.isNaN(spendingThreshold)) {
    throw new Error("Spending threshold must be a valid number");
  }

  if (spendingThreshold < 0) {
    throw new Error("Spending threshold cannot be negative");
  }

  if (
    mode !== "PERMANENT" &&
    mode !== "DYNAMIC"
  ) {
    throw new Error("Invalid Spending VIP mode");
  }

  return db.spendingRule.upsert({
    where: {
      shopId,
    },

    update: {
      enabled: enabled === true,
      threshold: spendingThreshold,
      mode,
    },

    create: {
      shopId,
      enabled: enabled === true,
      threshold: spendingThreshold,
      mode,
    },
  });
}

/**
 * Create or update a customer's spending record.
 *
 * eligibleAmount is the amount used to determine
 * Spending VIP eligibility.
 */
export async function updateCustomerSpending({
  customerId,
  eligibleAmount,
}) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const amount = Number(eligibleAmount);

  if (Number.isNaN(amount)) {
    throw new Error("Eligible spending amount must be valid");
  }

  if (amount < 0) {
    throw new Error(
      "Eligible spending amount cannot be negative",
    );
  }

  return db.customerSpending.upsert({
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
}

/**
 * Mark the time when a customer first unlocks
 * Spending VIP.
 *
 * This is important for PERMANENT mode.
 */
export async function markSpendingVipUnlocked(
  customerId,
) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  const spending = await db.customerSpending.findUnique({
    where: {
      customerId,
    },
  });

  if (!spending) {
    throw new Error("Customer spending record not found");
  }

  // Do not overwrite the original unlock date.
  if (spending.vipUnlockedAt) {
    return spending;
  }

  return db.customerSpending.update({
    where: {
      customerId,
    },

    data: {
      vipUnlockedAt: new Date(),
    },
  });
}

/**
 * Check whether a customer's current spending
 * qualifies for Spending VIP and record the unlock
 * date when appropriate.
 */
export async function evaluateCustomerSpendingVip({
  customerId,
  shopId,
}) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  const rule = await getSpendingRule(shopId);

  if (!rule.enabled) {
    return {
      qualifies: false,
      reason: "SPENDING_VIP_DISABLED",
    };
  }

  const spending = await db.customerSpending.findUnique({
    where: {
      customerId,
    },
  });

  if (!spending) {
    return {
      qualifies: false,
      reason: "NO_SPENDING_RECORD",
    };
  }

  const currentlyQualifies =
    spending.eligibleAmount >= rule.threshold;

  // Customer has reached the threshold.
  // Save the first time they unlocked VIP.
  if (
    currentlyQualifies &&
    !spending.vipUnlockedAt
  ) {
    await markSpendingVipUnlocked(customerId);
  }

  if (rule.mode === "PERMANENT") {
    return {
      qualifies:
        currentlyQualifies ||
        Boolean(spending.vipUnlockedAt),
      mode: "PERMANENT",
      threshold: rule.threshold,
      eligibleAmount: spending.eligibleAmount,
    };
  }

  return {
    qualifies: currentlyQualifies,
    mode: "DYNAMIC",
    threshold: rule.threshold,
    eligibleAmount: spending.eligibleAmount,
  };
}