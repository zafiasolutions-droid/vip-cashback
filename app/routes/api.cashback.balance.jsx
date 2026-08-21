import { authenticate } from "../shopify.server";
import db from "../db.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://extensions.shopifycdn.com",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function loader({ request }) {
  console.log("=== CASHBACK BALANCE REQUEST RECEIVED ===");

  // Handle browser CORS preflight request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    let sessionToken;

try {
  const result =
    await authenticate.public.customerAccount(request);

  sessionToken = result.sessionToken;
} catch (customerAccountError) {
  const result =
    await authenticate.public.checkout(request);

  sessionToken = result.sessionToken;
}

    console.log("Session token:", sessionToken);

    const customerGid = sessionToken.sub;

    if (!customerGid) {
      return new Response(
        JSON.stringify({
          error: "Customer ID not found.",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const shopifyCustomerId = customerGid.split("/").pop();

    const shop = new URL(sessionToken.iss).hostname;

    console.log("Customer ID:", shopifyCustomerId);
    console.log("Shop:", shop);

    const customer = await db.customer.findUnique({
      where: {
        shop_shopifyCustomerId: {
          shop: shop,
          shopifyCustomerId: shopifyCustomerId,
        },
      },
    });

    console.log("Customer found:", customer);

    return new Response(
      JSON.stringify({
        cashbackBalance: customer?.cashbackBalance ?? 0,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("=== CASHBACK BALANCE ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Unable to load cashback balance.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}

export async function action({ request }) {
  // Explicitly handle OPTIONS requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  return new Response("Method Not Allowed", {
    status: 405,
    headers: corsHeaders,
  });
}