import db from "../db.server";

/**
 * Calculate the current status of an Early Access event.
 *
 * UPCOMING:
 * Current time is before VIP access starts.
 *
 * VIP_ACTIVE:
 * VIP access has started, but public release has not started yet.
 *
 * COMPLETED:
 * Public release time has passed.
 */
export function getEarlyAccessEventStatus(event, now = new Date()) {
  const vipStartAt = new Date(event.vipStartAt);
  const publicReleaseAt = new Date(event.publicReleaseAt);

  if (now < vipStartAt) {
    return "UPCOMING";
  }

  if (now >= vipStartAt && now < publicReleaseAt) {
    return "VIP_ACTIVE";
  }

  return "COMPLETED";
}

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

  return {
    ...event,
    status: getEarlyAccessEventStatus(event),
  };
}

/**
 * Get all Early Access events for a shop.
 *
 * Status is calculated dynamically based on current time.
 */
export async function getEarlyAccessEvents(shopId) {
  const events = await db.earlyAccessEvent.findMany({
    where: {
      shopId,
    },
    orderBy: {
      publicReleaseAt: "asc",
    },
  });

  return events.map((event) => ({
    ...event,
    status: getEarlyAccessEventStatus(event),
  }));
}