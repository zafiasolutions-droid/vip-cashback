import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  console.log("=== CASHBACK BALANCE REQUEST RECEIVED ===");

  try {
    const { sessionToken, cors } =
      await authenticate.public.customerAccount(request);

    console.log("Session token:", sessionToken);

    const customerGid = sessionToken.sub;

    if (!customerGid) {
      return cors(
        new Response(
          JSON.stringify({
            error: "Customer ID not found.",
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );
    }

    const shopifyCustomerId = customerGid.split("/").pop();

    const shop =
      new URL(sessionToken.iss).hostname;

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

    return cors(
      new Response(
        JSON.stringify({
          cashbackBalance: customer?.cashbackBalance ?? 0,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );
  } catch (error) {
    console.error("=== CASHBACK BALANCE ERROR ===");
    console.error(error);

    return new Response(
      JSON.stringify({
        error: error.message || "Unable to load cashback balance.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}