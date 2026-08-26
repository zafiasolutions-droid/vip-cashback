import { authenticate } from "../shopify.server.js";
import { getOrCreateShop } from "../services/shop.server.js";

export const action = async ({ request }) => {
  try {
    const { shop, topic, payload } =
      await authenticate.webhook(request);

    console.log("PRODUCT WEBHOOK RECEIVED", {
      shop,
      topic,
      productId: payload.id,
      productTitle: payload.title,
    });

    const localShop =
      await getOrCreateShop(shop);

    console.log("LOCAL SHOP", {
      id: localShop.id,
      domain: localShop.domain,
    });

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "PRODUCT WEBHOOK ERROR:",
      error,
    );

    return new Response(null, {
      status: 500,
    });
  }
};