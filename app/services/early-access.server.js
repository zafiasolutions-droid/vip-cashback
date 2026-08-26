
import db from "../db.server.js";
import { isCustomerVip } from "./vip-status.server.js";

/**
 * Normalize Shopify Product IDs.
 *
 * Supports:
 * - 123456789
 * - gid://shopify/Product/123456789
 */
function normalizeShopifyProductId(productId) {
  if (!productId) {
    return null;
  }

  const value = String(productId);

  const match = value.match(/(\d+)$/);

  return match ? match[1] : value;
}

function convertStoreTimeToUtc(dateTime, timezone) {
  const [datePart, timePart] = dateTime.split("T");

  const [year, month, day] =
    datePart.split("-").map(Number);

  const [hour, minute] =
    timePart.split(":").map(Number);

  const utcGuess = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
    ),
  );

  const formatter = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  );

  const parts = formatter.formatToParts(utcGuess);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const timezoneTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
  );

  const offset = timezoneTime - utcGuess.getTime();

  return new Date(
    utcGuess.getTime() - offset,
  );
}

/**
 * Calculate the current status of an Early Access event.
 */
export function getEarlyAccessEventStatus(
  event,
  now = new Date(),
) {
  if (event.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (event.status === "ARCHIVED") {
    return "ARCHIVED";
  }

  const vipStartAt = new Date(event.vipStartAt);

  const publicReleaseAt = new Date(
    event.publicReleaseAt,
  );

  if (now < vipStartAt) {
    return "UPCOMING";
  }

  if (
    now >= vipStartAt &&
    now < publicReleaseAt
  ) {
    return "VIP_ACTIVE";
  }

  return "COMPLETED";
}

/**
 * Create a new manually scheduled
 * Early Access event.
 */
export async function createEarlyAccessEvent({
  shopId,
  shopifyProductId,
  productTitleSnapshot,
  vipStartAt,
  publicReleaseAt,
  timezone,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!shopifyProductId) {
    throw new Error("Product ID is required");
  }

  if (!vipStartAt) {
    throw new Error(
      "VIP start time is required",
    );
  }

  if (!publicReleaseAt) {
    throw new Error(
      "Public release time is required",
    );
  }

  if (!timezone) {
    throw new Error(
      "Shop timezone is required",
    );
  }

  const normalizedProductId =
    normalizeShopifyProductId(shopifyProductId);

  const vipStartDate = convertStoreTimeToUtc(
    vipStartAt,
    timezone,
  );

  const publicReleaseDate =
    convertStoreTimeToUtc(
      publicReleaseAt,
      timezone,
    );

  if (
    Number.isNaN(vipStartDate.getTime())
  ) {
    throw new Error(
      "Invalid VIP start time",
    );
  }

  if (
    Number.isNaN(
      publicReleaseDate.getTime(),
    )
  ) {
    throw new Error(
      "Invalid public release time",
    );
  }

  if (vipStartDate >= publicReleaseDate) {
    throw new Error(
      "VIP start time must be earlier than public release time",
    );
  }

  const existingEvents =
    await db.earlyAccessEvent.findMany({
      where: {
        shopId,
      },
    });

  const matchingEvents =
    existingEvents.filter((event) => {
      return (
        normalizeShopifyProductId(
          event.shopifyProductId,
        ) === normalizedProductId
      );
    });

  const blockingEvent =
    matchingEvents.find((event) => {
      const status =
        getEarlyAccessEventStatus(event);

      return (
        status === "UPCOMING" ||
        status === "VIP_ACTIVE"
      );
    });

  if (blockingEvent) {
    throw new Error(
      "This product already has an active or upcoming Early Access event.",
    );
  }

  const event =
    await db.earlyAccessEvent.create({
      data: {
        shopId,
        shopifyProductId:
          normalizedProductId,
        productTitleSnapshot:
          productTitleSnapshot || null,
        vipStartAt: vipStartDate,
        publicReleaseAt:
          publicReleaseDate,
        status: "UPCOMING",
      },
    });

  return {
    ...event,
    status:
      getEarlyAccessEventStatus(event),
  };
}

/**
 * Automatically create a 10-minute
 * VIP Early Access event.
 *
 * VIP access starts immediately.
 * Public access starts automatically
 * after 10 minutes.
 */
export async function createAutomaticEarlyAccessEvent({
  shopId,
  shopifyProductId,
  productTitleSnapshot,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!shopifyProductId) {
    throw new Error(
      "Shopify product ID is required",
    );
  }

  const normalizedProductId =
    normalizeShopifyProductId(
      shopifyProductId,
    );

  // Check whether this product already
  // has an active Early Access event.
  const existingEvents =
    await db.earlyAccessEvent.findMany({
      where: {
        shopId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const blockingEvent =
    existingEvents.find((event) => {
      const eventProductId =
        normalizeShopifyProductId(
          event.shopifyProductId,
        );

      if (
        eventProductId !== normalizedProductId
      ) {
        return false;
      }

      const status =
        getEarlyAccessEventStatus(event);

      return (
        status === "UPCOMING" ||
        status === "VIP_ACTIVE"
      );
    });

  // Prevent duplicate active events.
  if (blockingEvent) {
    return {
      created: false,
      reason: "EVENT_ALREADY_ACTIVE",
      event: {
        ...blockingEvent,
        status:
          getEarlyAccessEventStatus(
            blockingEvent,
          ),
      },
    };
  }

  // VIP access starts immediately.
  const vipStartAt =
    new Date();

  // Public release happens exactly
  // 10 minutes later.
  const publicReleaseAt =
    new Date(
      vipStartAt.getTime() +
        10 * 60 * 1000,
    );

  const event =
    await db.earlyAccessEvent.create({
      data: {
        shopId,

        shopifyProductId:
          normalizedProductId,

        productTitleSnapshot:
          productTitleSnapshot || null,

        vipStartAt,

        publicReleaseAt,

        status: "UPCOMING",
      },
    });

  return {
    created: true,

    event: {
      ...event,

      status:
        getEarlyAccessEventStatus(event),
    },
  };
}

/**
 * Cancel an Early Access event.
 */
export async function cancelEarlyAccessEvent({
  shopId,
  eventId,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!eventId) {
    throw new Error("Event ID is required");
  }

  const event =
    await db.earlyAccessEvent.findFirst({
      where: {
        id: Number(eventId),
        shopId,
      },
    });

  if (!event) {
    throw new Error(
      "Early Access event not found.",
    );
  }

  const currentStatus =
    getEarlyAccessEventStatus(event);

  if (currentStatus === "CANCELLED") {
    throw new Error(
      "This Early Access event is already cancelled.",
    );
  }

  if (currentStatus === "COMPLETED") {
    throw new Error(
      "A completed Early Access event cannot be cancelled.",
    );
  }

  const cancelledEvent =
    await db.earlyAccessEvent.update({
      where: {
        id: event.id,
      },
      data: {
        status: "CANCELLED",
      },
    });

  return {
    ...cancelledEvent,
    status: "CANCELLED",
  };
}

/**
 * Get all Early Access events for a shop.
 */
export async function getEarlyAccessEvents(
  shopId,
) {
  const events =
    await db.earlyAccessEvent.findMany({
      where: {
        shopId,
      },
      orderBy: {
        publicReleaseAt: "asc",
      },
    });

  return events.map((event) => ({
    ...event,
    status:
      getEarlyAccessEventStatus(event),
  }));
}

/**
 * Check whether a customer can access
 * an Early Access product.
 */
export async function checkEarlyAccessEligibility({
  shopId,
  shopifyProductId,
  shopifyCustomerId,
}) {
  if (!shopId) {
    throw new Error("Shop ID is required");
  }

  if (!shopifyProductId) {
    throw new Error(
      "Shopify product ID is required",
    );
  }

  const normalizedProductId =
    normalizeShopifyProductId(
      shopifyProductId,
    );

  const events =
    await db.earlyAccessEvent.findMany({
      where: {
        shopId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const event = events.find(
    (item) =>
      normalizeShopifyProductId(
        item.shopifyProductId,
      ) === normalizedProductId,
  );

  console.log("EARLY ACCESS CHECK", {
    shopId,
    receivedProductId: shopifyProductId,
    normalizedProductId,
    availableEvents: events.map((item) => ({
      id: item.id,
      title: item.productTitleSnapshot,
      productId: item.shopifyProductId,
      normalizedId:
        normalizeShopifyProductId(
          item.shopifyProductId,
        ),
      status:
        getEarlyAccessEventStatus(item),
    })),
    matchedEvent: event
      ? {
          id: event.id,
          title: event.productTitleSnapshot,
          productId:
            event.shopifyProductId,
        }
      : null,
  });

  // No Early Access event means
  // the product is public.
  if (!event) {
    return {
      allowed: true,
      reason: "NO_EARLY_ACCESS_EVENT",
    };
  }

  const status =
    getEarlyAccessEventStatus(event);

  if (
    status === "UPCOMING" ||
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "ARCHIVED"
  ) {
    return {
      allowed: true,
      reason: status,
      event,
    };
  }

  // VIP_ACTIVE:
  // Customer must be logged in.
  if (!shopifyCustomerId) {
    return {
      allowed: false,
      reason: "VIP_CUSTOMER_REQUIRED",
      event,
    };
  }

  const isVip = await isCustomerVip({
    shopId,
    shopifyCustomerId,
  });

  return {
    allowed: isVip,
    reason: isVip
      ? "VIP_ACCESS_GRANTED"
      : "VIP_ACCESS_REQUIRED",
    event,
  };
}
