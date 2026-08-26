import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } =
      await authenticate.webhook(request);

    console.log("PRODUCT EVENT RECEIVED", {
      shop,
      topic,
      payload,
    });

    return new Response("OK", {
      status: 200,
    });
  } catch (error) {
    console.error(
      "PRODUCT EVENT ERROR:",
      error,
    );

    return new Response("Webhook error", {
      status: 500,
    });
  }
};