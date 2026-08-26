import db from "../db.server";

export const loader = async () => {
  try {
    const customer = await db.customer.findFirst({
      where: {
        shopId: 1,
        shopifyCustomerId: "9734410338626",
      },
      include: {
        manualVip: true,
        spending: true,
        twitchConnection: true,
      },
    });

    if (!customer) {
      return Response.json({
        success: false,
        error: "Customer not found",
      });
    }

    const twitchVip =
      customer.twitchConnection?.isSubscriber === true;

    return Response.json({
      success: true,
      isVip: twitchVip,
      reasons: twitchVip ? ["TWITCH"] : [],
      sources: {
        manual: false,
        spending: false,
        twitch: twitchVip,
      },
      debug: {
        twitchConnection:
          customer.twitchConnection,
      },
    });
  } catch (error) {
    console.error("VIP debug error:", error);

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