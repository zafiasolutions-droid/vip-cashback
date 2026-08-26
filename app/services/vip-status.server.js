import db from "../db.server";

export const loader = async () => {
  const connection =
    await db.twitchConnection.update({
      where: {
        customerId: 1,
      },
      data: {
        isSubscriber: true,
        lastVerifiedAt: new Date(),
      },
    });

  return Response.json({
    success: true,
    isSubscriber: connection.isSubscriber,
    updatedAt: connection.updatedAt,
  });
};