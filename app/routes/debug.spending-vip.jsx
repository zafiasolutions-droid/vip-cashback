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
          spending: true,
        },
      });

    const spendingRule =
      await db.spendingRule.findFirst();

    return Response.json({
      success: true,
      customer,
      spendingRule,
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