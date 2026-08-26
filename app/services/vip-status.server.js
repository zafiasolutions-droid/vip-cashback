import db from "../db.server";

export const loader = async () => {
  try {
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
  } catch (error) {
    console.error("Twitch test error:", error);

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