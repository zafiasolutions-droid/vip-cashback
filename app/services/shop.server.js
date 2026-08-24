import db from "../db.server";

/**

* Find an existing shop or create it if it does not exist.
* Also stores the Shopify store currency and timezone
* when provided.
*
* @param {string} shopDomain Shopify shop domain
* @param {string|null} currency Shopify store currency code
* @param {string|null} timezone Shopify IANA timezone
* @returns {Promise<object>} Shop database record
  */
  export async function getOrCreateShop(
  shopDomain,
  currency = null,
  timezone = null,
  ) {
  if (!shopDomain) {
  throw new Error("Shop domain is required");
  }

const updateData = {};

if (currency) {
updateData.currency = currency;
}

if (timezone) {
updateData.timezone = timezone;
}

const shop = await db.shop.upsert({
where: {
domain: shopDomain,
},

update: updateData,

create: {
  domain: shopDomain,
  currency,
  timezone,
},


});

return shop;
}
