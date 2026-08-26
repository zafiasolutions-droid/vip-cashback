import db from "../db.server";

export const loader = async () => {
  try {
    const customerId = 1;

    const customer =
      await db.customer.findUnique({
        where: {
          id: customerId,
        },
        include: {
          manualVip: true,
          spending: true,
          twitchConnection: true,
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

    const manualVip =
      customer.manualVip?.isActive === true;

    const twitchVip =
      customer.twitchConnection?.isSubscriber === true;

    return Response.json({
      success: true,

      isVip: manualVip || twitchVip,

      reasons: [
        ...(manualVip ? ["MANUAL"] : []),
        ...(twitchVip ? ["TWITCH"] : []),
      ],

      sources: {
        manual: manualVip,
        spending: false,
        twitch: twitchVip,
      },
    });
  } catch (error) {
    console.error("Manual VIP status test error:", error);

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