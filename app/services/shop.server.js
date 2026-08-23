import db from "../db.server";

/**
 * Find an existing shop or create it if it does not exist.
 *
 * @param {string} shopDomain Shopify shop domain
 * @returns {Promise<object>} Shop database record
 */
export async function getOrCreateShop(shopDomain) {
  if (!shopDomain) {
    throw new Error("Shop domain is required");
  }

  const shop = await db.shop.upsert({
    where: {
      domain: shopDomain,
    },

    update: {},

    create: {
      domain: shopDomain,
    },
  });

  return shop;
}