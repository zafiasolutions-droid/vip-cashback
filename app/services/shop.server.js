import db from "../db.server";

/**
 * Find an existing shop or create it if it does not exist.
 * Also stores the Shopify store currency when provided.
 *
 * @param {string} shopDomain Shopify shop domain
 * @param {string|null} currency Shopify store currency code
 * @returns {Promise<object>} Shop database record
 */
export async function getOrCreateShop(shopDomain, currency = null) {
  if (!shopDomain) {
    throw new Error("Shop domain is required");
  }

  const shop = await db.shop.upsert({
    where: {
      domain: shopDomain,
    },

    update: currency
      ? {
          currency,
        }
      : {},

    create: {
      domain: shopDomain,
      currency,
    },
  });

  return shop;
}