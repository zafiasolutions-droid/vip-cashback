import db from "../db.server";
import { verifyTwitchSubscriber } from "../services/twitch-verification.server";
export const loader = async ({ request }) => {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return Response.json({
      success: false,
      error,
    });
  }

  if (!code) {
    return Response.json(
      {
        success: false,
        error: "Missing authorization code",
      },
      { status: 400 },
    );
  }

  if (!state) {
    return Response.json(
      {
        success: false,
        error: "Missing customer ID",
      },
      { status: 400 },
    );
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri
  ) {
    throw new Error(
      "Twitch environment variables are missing",
    );
  }

  try {
    // Exchange authorization code for Twitch tokens.
    const tokenResponse = await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      },
    );

    const tokenData =
      await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Twitch token error:",
        tokenData,
      );

      return Response.json(
        {
          success: false,
          error:
            "Failed to get Twitch access token",
        },
        { status: 500 },
      );
    }

    // Get Twitch user information.
    const userResponse = await fetch(
      "https://api.twitch.tv/helix/users",
      {
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`,
          "Client-Id": clientId,
        },
      },
    );

    const userData =
      await userResponse.json();

    if (!userResponse.ok) {
      console.error(
        "Twitch user error:",
        userData,
      );

      return Response.json(
        {
          success: false,
          error:
            "Failed to get Twitch user information",
        },
        { status: 500 },
      );
    }

    const twitchUser = userData.data?.[0];

    if (!twitchUser) {
      return Response.json(
        {
          success: false,
          error: "Twitch user not found",
        },
        { status: 404 },
      );
    }

    // `state` is the local database Customer ID
    // for this temporary testing flow.
    let stateData;

try {
  stateData = JSON.parse(
    Buffer.from(
      state,
      "base64url",
    ).toString("utf8"),
  );
} catch (error) {
  return Response.json(
    {
      success: false,
      error: "Invalid authorization state",
    },
    { status: 400 },
  );
}

const customerId =
  Number(stateData.customerId);

const returnTo =
  stateData.returnTo || "/";

if (
  !Number.isInteger(customerId) ||
  customerId <= 0
) {
  return Response.json(
    {
      success: false,
      error: "Invalid customer ID",
    },
    { status: 400 },
  );
}

    // Confirm the customer exists.
    const customer =
      await db.customer.findUnique({
        where: {
          id: customerId,
        },
      });

    if (!customer) {
      return Response.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      );
    }

    // One Twitch account can only be linked
    // to one Shopify customer.
    const existingTwitchConnection =
      await db.twitchConnection.findUnique({
        where: {
          twitchUserId: String(twitchUser.id),
        },
      });

    if (
      existingTwitchConnection &&
      existingTwitchConnection.customerId !==
        customer.id
    ) {
      return Response.json(
        {
          success: false,
          error:
            "This Twitch account is already linked to another customer",
        },
        { status: 409 },
      );
    }

    // Create or update the Twitch connection.
    const connection =
      await db.twitchConnection.upsert({
  where: {
    customerId,
  },

  update: {
    twitchUserId: String(twitchUser.id),
    login: twitchUser.login,
    displayName: twitchUser.display_name,

    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,

    tokenExpiresAt: tokenData.expires_in
      ? new Date(
          Date.now() +
            tokenData.expires_in * 1000,
        )
      : null,
  },

  create: {
    customerId,
    twitchUserId: String(twitchUser.id),
    login: twitchUser.login,
    displayName: twitchUser.display_name,

    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,

    tokenExpiresAt: tokenData.expires_in
      ? new Date(
          Date.now() +
            tokenData.expires_in * 1000,
        )
      : null,
  },
});

const verification =
  await verifyTwitchSubscriber({
    customerId: customer.id,
    shopId: customer.shopId,
  });

    const redirectUrl = new URL(
  returnTo,
);

redirectUrl.searchParams.set(
  "twitch_connected",
  "true",
);

redirectUrl.searchParams.set(
  "vip_verified",
  verification.isSubscriber
    ? "true"
    : "false",
);

return Response.redirect(
  redirectUrl.toString(),
);
  } catch (error) {
    console.error(
      "Twitch OAuth callback error:",
      error,
    );

    return Response.json(
      {
        success: false,
        error: "Twitch OAuth failed",
      },
      { status: 500 },
    );
  }
};