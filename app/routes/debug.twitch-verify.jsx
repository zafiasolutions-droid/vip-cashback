import db from "../db.server";

export const loader = async () => {
  const customer = await db.customer.findUnique({
    where: {
      id: 1,
    },
  });

  const twitchConnection =
    await db.twitchConnection.findUnique({
      where: {
        customerId: 1,
      },
    });

  return Response.json({
    customer,
    twitchConnection,
  });
};