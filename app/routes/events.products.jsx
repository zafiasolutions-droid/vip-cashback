import { authenticate } from "../shopify.server.js";
import { getOrCreateShop } from "../services/shop.server.js";
import db from "../db.server.js";

function normalizeShopifyId(id) {
  if (!id) {
    return null;
  }

  const value = String(id);
  const match = value.match(/(\d+)$/);

  return match ? match[1] : value;
}

export const action = async ({ request }) => {
  try {
    const webhook = await authenticate.webhook(request);

    const topic = webhook.topic;
    const shop = webhook.shop;
    const payload = webhook.payload;
    const admin = webhook.admin;

    console.log("PRODUCT EVENT RECEIVED", {
      shop,
      topic,
      payload,
    });

    const productId =
      payload &&
      payload.query_variables &&
      payload.query_variables.productId;

    if (!productId) {
      console.log(
        "PRODUCT EVENT HAS NO PRODUCT ID",
        payload,
      );

      return new Response("OK", {
        status: 200,
      });
    }

    const localShop =
      await getOrCreateShop(shop);

    console.log("LOCAL SHOP", {
      id: localShop.id,
      domain: localShop.domain,
    });

    const vipCollections =
      await db.earlyAccessCollection.findMany({
        where: {
          shopId: localShop.id,
          enabled: true,
        },
      });

    if (vipCollections.length === 0) {
      console.log(
        "NO ACTIVE VIP COLLECTIONS FOUND",
      );

      return new Response("OK", {
        status: 200,
      });
    }

    const query =
      "query GetProductCollections($id: ID!) {" +
      " product(id: $id) {" +
      " id" +
      " title" +
      " collections(first: 100) {" +
      " nodes {" +
      " id" +
      " title" +
      " }" +
      " }" +
      " }" +
      " }";

    const response = await admin.graphql(
      query,
      {
        variables: {
          id: productId,
        },
      },
    );

    const responseJson =
      await response.json();

    const product =
      responseJson.data &&
      responseJson.data.product;

    if (!product) {
      console.log("PRODUCT NOT FOUND", {
        productId,
        errors: responseJson.errors,
      });

      return new Response("OK", {
        status: 200,
      });
    }

    const productCollections =
      product.collections.nodes;

    console.log("PRODUCT COLLECTIONS", {
      productId: product.id,
      productTitle: product.title,
      collections: productCollections,
    });

    const vipCollectionIds =
      vipCollections.map((collection) => {
        return normalizeShopifyId(
          collection.shopifyCollectionId,
        );
      });

    const matchedCollection =
      productCollections.find((collection) => {
        return vipCollectionIds.includes(
          normalizeShopifyId(collection.id),
        );
      });

    if (!matchedCollection) {
      console.log(
        "PRODUCT NOT IN VIP COLLECTION",
        {
          productId: product.id,
          productTitle: product.title,
        },
      );

      return new Response("OK", {
        status: 200,
      });
    }

    console.log(
      "VIP COLLECTION MATCH FOUND",
      {
        productId: product.id,
        productTitle: product.title,
        collectionId: matchedCollection.id,
        collectionTitle:
          matchedCollection.title,
      },
    );

    return new Response("OK", {
      status: 200,
    });
  } catch (error) {
    console.error(
      "PRODUCT EVENT ERROR:",
      error,
    );

    return new Response(
      "Webhook error",
      {
        status: 500,
      },
    );
  }
};