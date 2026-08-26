import db from "../db.server";

/**
 * Check whether a connected Twitch customer
 * is an active subscriber of the merchant's
 * configured Twitch channel.
 */
export async function verifyTwitchSubscriber({
  customerId,
  shopId,
}) {
  if (!customerId) {
    throw new Error("Customer ID is required");
  }

  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  const connection =
    await db.twitchConnection.findUnique({
      where: {
        customerId,
      },
    });

  if (!connection) {
    return {
      isVip: false,
      reason: "TWITCH_NOT_CONNECTED",
    };
  }

  const channel =
    await db.twitchChannel.findUnique({
      where: {
        shopId,
      },
    });

  if (!channel) {
    return {
      isVip: false,
      reason: "TWITCH_CHANNEL_NOT_CONFIGURED",
    };
  }

  if (!connection.accessToken) {
    return {
      isVip: false,
      reason: "TWITCH_ACCESS_TOKEN_MISSING",
    };
  }

  const clientId = process.env.TWITCH_CLIENT_ID;

  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${channel.twitchUserId}&user_id=${connection.twitchUserId}`,
      {
        headers: {
          Authorization:
            `Bearer ${connection.accessToken}`,
          "Client-Id": clientId,
        },
      },
    );

    // 404 means the user is not subscribed.
    if (response.status === 404) {
      await db.twitchConnection.update({
        where: {
          customerId,
        },
        data: {
          isSubscriber: false,
          lastVerifiedAt: new Date(),
        },
      });

      return {
        isVip: false,
        reason: "TWITCH_NOT_SUBSCRIBER",
      };
    }

    if (!response.ok) {
      const errorData = await response.json();

      console.error(
        "Twitch subscription verification error:",
        errorData,
      );

      return {
        isVip: false,
        reason: "TWITCH_VERIFICATION_FAILED",
      };
    }

    const subscriptionData =
      await response.json();

    const isSubscriber =
      Boolean(subscriptionData.data?.[0]);

    await db.twitchConnection.update({
      where: {
        customerId,
      },
      data: {
        isSubscriber,
        lastVerifiedAt: new Date(),
      },
    });

    return {
      isVip: isSubscriber,
      reason: isSubscriber
        ? "TWITCH_VIP_ACTIVE"
        : "TWITCH_NOT_SUBSCRIBER",
    };
  } catch (error) {
    console.error(
      "Twitch subscriber verification error:",
      error,
    );

    return {
      isVip: false,
      reason: "TWITCH_VERIFICATION_FAILED",
    };
  }
}