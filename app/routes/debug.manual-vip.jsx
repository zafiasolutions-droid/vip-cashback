import db from "../db.server";

export const loader = async () => {
  try {
    const customerId = 1;

    const manualVip =
      await db.manualVip.upsert({
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

    return Response.json({
      success: true,
      message: "Manual VIP enabled",
      manualVip,
    });
  } catch (error) {
    console.error("Manual VIP test error:", error);

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