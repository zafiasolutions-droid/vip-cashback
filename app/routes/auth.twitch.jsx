import db from "../db.server";

export const loader = async ({ request }) => {
  const clientId =
    process.env.TWITCH_CLIENT_ID;

  const redirectUri =
    process.env.TWITCH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error(
      "Twitch environment variables are missing",
    );
  }

  const url = new URL(request.url);

  const shopifyCustomerId =
    url.searchParams.get("customer_id");

  const shopDomain =
    url.searchParams.get("shop");

  const returnTo =
    url.searchParams.get("return_to");

  if (!shopifyCustomerId) {
    return new Response(
      "Please log in to your Shopify account first.",
      {
        status: 400,
      },
    );
  }

  if (!shopDomain) {
    return new Response(
      "Missing shop domain.",
      {
        status: 400,
      },
    );
  }

  const shop =
    await db.shop.findUnique({
      where: {
        domain: shopDomain,
      },
    });

  if (!shop) {
    return new Response(
      "Shop not found.",
      {
        status: 404,
      },
    );
  }

  const customer =
    await db.customer.findUnique({
      where: {
        shopId_shopifyCustomerId: {
          shopId: shop.id,
          shopifyCustomerId:
            String(shopifyCustomerId),
        },
      },
    });

  if (!customer) {
    return new Response(
      "Customer not found in the VIP system.",
      {
        status: 404,
      },
    );
  }

  const stateData = {
    customerId: customer.id,
    returnTo: returnTo || "/",
  };

  const state = Buffer.from(
    JSON.stringify(stateData),
  ).toString("base64url");

  const scopes = [
    "user:read:email",
    "user:read:subscriptions",
  ].join(" ");

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