import db from "../db.server";

export const loader = async () => {
  const customers = await db.customer.findMany({
    select: {
      id: true,
      shopId: true,
      shopifyCustomerId: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  return Response.json({
    count: customers.length,
    customers,
  });
};