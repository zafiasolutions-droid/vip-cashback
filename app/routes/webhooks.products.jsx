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
    const { shop, topic, payload, admin } =
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

    // Get enabled VIP collections for this shop.
    const vipCollections =
      await db.earlyAccessCollection.findMany({
        where: {
          shopId: localShop.id,
          enabled: true,
        },
      });

    // No VIP collections configured.
    if (vipCollections.length === 0) {
      console.log(
        "NO ACTIVE VIP COLLECTIONS FOUND",
      );

      return new Response(null, {
        status: 200,
      });
    }

    // Fetch the product's collections from Shopify.
    const productId =
      `gid://shopify/Product/${payload.id}`;

    const response = await admin.graphql(
      `
        query GetProductCollections($id: ID!) {
          product(id: $id) {
            id
            title
            collections(first: 100) {
              nodes {
                id
                title
              }
            }
          }
        }
      `,
      {
        variables: {
          id: productId,
        },
      },
    );

    const responseJson =
      await response.json();

    const product =
      responseJson.data?.product;

    if (!product) {
      console.log(
        "PRODUCT NOT FOUND IN SHOPIFY",
        {
          productId,
        },
      );

      return new Response(null, {
        status: 200,
      });
    }

    const productCollections =
      product.collections.nodes;

    console.log(
      "PRODUCT COLLECTIONS",
      productCollections,
    );

    // Normalize configured VIP collection IDs.
    const vipCollectionIds =
      vipCollections.map((collection) =>
        normalizeShopifyId(
          collection.shopifyCollectionId,
        ),
      );

    // Check whether this product belongs
    // to any enabled VIP collection.
    const matchedCollection =
      productCollections.find((collection) =>
        vipCollectionIds.includes(
          normalizeShopifyId(collection.id),
        ),
      );

    if (!matchedCollection) {
      console.log(
        "PRODUCT IS NOT IN A VIP COLLECTION",
        {
          productId: payload.id,
          productCollections:
            productCollections.map(
              (collection) => ({
                id: collection.id,
                title: collection.title,
              }),
            ),
        },
      );

      return new Response(null, {
        status: 200,
      });
    }

    console.log(
      "VIP COLLECTION MATCH FOUND",
      {
        productId: payload.id,
        productTitle: product.title,
        collectionId:
          matchedCollection.id,
        collectionTitle:
          matchedCollection.title,
      },
    );

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