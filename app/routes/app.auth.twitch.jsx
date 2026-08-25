export const loader = async () => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Twitch environment variables are missing");
  }

  const scopes = [
    "user:read:email",
  ].join(" ");

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });

  return Response.redirect(
    `https://id.twitch.tv/oauth2/authorize?${params.toString()}`,
  );
};