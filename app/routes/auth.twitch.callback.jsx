export const loader = async ({ request }) => {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
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
      {
        status: 400,
      },
    );
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret =
    process.env.TWITCH_CLIENT_SECRET;
  const redirectUri =
    process.env.TWITCH_REDIRECT_URI;

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
    // Exchange authorization code for tokens.
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
        {
          status: 500,
        },
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
        {
          status: 500,
        },
      );
    }

    const twitchUser = userData.data?.[0];

    if (!twitchUser) {
      return Response.json(
        {
          success: false,
          error: "Twitch user not found",
        },
        {
          status: 404,
        },
      );
    }

    return Response.json({
      success: true,

      twitchUser: {
        id: twitchUser.id,
        login: twitchUser.login,
        displayName: twitchUser.display_name,
        email: twitchUser.email || null,
      },
    });
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
      {
        status: 500,
      },
    );
  }
};