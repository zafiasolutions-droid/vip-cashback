import db from "../db.server";

export const loader = async () => {
  try {
    const customerId = 1;

    const spending =
      await db.customerSpending.upsert({
        where: {
          customerId,
        },

        update: {
          eligibleAmount: 807.9,
          vipUnlockedAt: new Date(),
          lastCalculatedAt: new Date(),
        },

        create: {
          customerId,
          eligibleAmount: 807.9,
          vipUnlockedAt: new Date(),
          lastCalculatedAt: new Date(),
        },
      });

    return Response.json({
      success: true,
      message: "Customer spending test data saved",
      spending,
    });
  } catch (error) {
    console.error("Spending VIP debug error:", error);

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