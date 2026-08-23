import db from "../db.server";

/**
 * Create a new Early Access event.
 */
export async function createEarlyAccessEvent({
  shopId,
  shopifyProductId,
  productTitleSnapshot,
  vipStartAt,
  publicReleaseAt,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!shopifyProductId) {
    throw new Error("Product ID is required");
  }

  if (!vipStartAt) {
    throw new Error("VIP start time is required");
  }

  if (!publicReleaseAt) {
    throw new Error("Public release time is required");
  }

  const vipStartDate = new Date(vipStartAt);
  const publicReleaseDate = new Date(publicReleaseAt);

  if (Number.isNaN(vipStartDate.getTime())) {
    throw new Error("Invalid VIP start time");
  }

  if (Number.isNaN(publicReleaseDate.getTime())) {
    throw new Error("Invalid public release time");
  }

  if (vipStartDate >= publicReleaseDate) {
    throw new Error(
      "VIP start time must be earlier than public release time",
    );
  }

  const event = await db.earlyAccessEvent.create({
    data: {
      shopId,
      shopifyProductId: String(shopifyProductId),
      productTitleSnapshot: productTitleSnapshot || null,
      vipStartAt: vipStartDate,
      publicReleaseAt: publicReleaseDate,
    },
  });

  return event;
}

/**
 * Get all Early Access events for a shop.
 */
export async function getEarlyAccessEvents(shopId) {
  return db.earlyAccessEvent.findMany({
    where: {
      shopId,
    },
    orderBy: {
      publicReleaseAt: "asc",
    },
  });
}