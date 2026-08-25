export const loader = async ({ request }) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Twitch environment variables are missing");
  }

  const url = new URL(request.url);

  const customerId =
    url.searchParams.get("customer_id");

  if (!customerId) {
    return Response.json(
      {
        success: false,
        error: "Missing Shopify customer ID",
      },
      {
        status: 400,
      },
    );
  }

  const scopes = [
    "user:read:email",
  ].join(" ");

  // For the moment, use state to carry the
  // Shopify customer ID to the callback.
  const state = customerId;

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