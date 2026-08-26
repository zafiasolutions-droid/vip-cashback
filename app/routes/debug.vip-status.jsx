import db from "../db.server";

export const loader = async () => {
  try {
    const customerId = 1;

    const customer = await db.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        manualVip: true,
        spending: true,
        twitchConnection: true,
      },
    });

    const spendingRule =
      await db.spendingRule.findUnique({
        where: {
          shopId: customer.shopId,
        },
      });

    if (!customer) {
      return Response.json(
        {
          success: false,
          error: "Customer not found",
        },
        {
          status: 404,
        },
      );
    }

    // Manual VIP
    const manualVip =
      customer.manualVip?.isActive === true;

    // Spending VIP
    let spendingVip = false;

    if (
      spendingRule?.enabled &&
      customer.spending?.vipUnlockedAt
    ) {
      if (spendingRule.mode === "PERMANENT") {
        spendingVip = true;
      }

      if (spendingRule.mode === "DYNAMIC") {
        spendingVip =
          customer.spending.eligibleAmount >=
          spendingRule.threshold;
      }
    }

    // Twitch VIP
    const twitchVip =
      customer.twitchConnection?.isSubscriber === true;

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

    return Response.json({
  success: true,

  isVip: reasons.length > 0,

  reasons,

  sources: {
    manual: manualVip,
    spending: spendingVip,
    twitch: twitchVip,
  },

  debug: {
    spendingRule,
    customerSpending: customer.spending,
  },
});
  } catch (error) {
    console.error("VIP status debug error:", error);

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
};