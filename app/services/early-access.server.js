import db from "../db.server";
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
export function getEarlyAccessEventStatus(event, now = new Date()) {
  // Permanently preserve manually controlled statuses.
  if (event.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (event.status === "ARCHIVED") {
    return "ARCHIVED";
  }

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
  timezone,
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

  if (!timezone) {
    throw new Error("Shop timezone is required");
  }

  const vipStartDate = convertStoreTimeToUtc(
  vipStartAt,
  timezone,
);

const publicReleaseDate = convertStoreTimeToUtc(
  publicReleaseAt,
  timezone,
);

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

  const existingEvents = await db.earlyAccessEvent.findMany({
    where: {
      shopId,
      shopifyProductId: String(shopifyProductId),
    },
  });

  const blockingEvent = existingEvents.find((event) => {
    const status = getEarlyAccessEventStatus(event);

    return status === "UPCOMING" || status === "VIP_ACTIVE";
  });

  if (blockingEvent) {
    throw new Error(
      "This product already has an active or upcoming Early Access event.",
    );
  }

  const event = await db.earlyAccessEvent.create({
    data: {
      shopId,
      shopifyProductId: String(shopifyProductId),
      productTitleSnapshot: productTitleSnapshot || null,
      vipStartAt: vipStartDate,
      publicReleaseAt: publicReleaseDate,
      status: "UPCOMING",
    },
  });

  return {
    ...event,
    status: getEarlyAccessEventStatus(event),
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

  const event = await db.earlyAccessEvent.findFirst({
    where: {
      id: Number(eventId),
      shopId,
    },
  });

  if (!event) {
    throw new Error("Early Access event not found.");
  }

  const currentStatus = getEarlyAccessEventStatus(event);

  if (currentStatus === "CANCELLED") {
    throw new Error("This Early Access event is already cancelled.");
  }

  if (currentStatus === "COMPLETED") {
    throw new Error(
      "A completed Early Access event cannot be cancelled.",
    );
  }

  const cancelledEvent = await db.earlyAccessEvent.update({
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

/**
 * Check whether a customer can access an Early Access product.
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
    throw new Error("Shopify product ID is required");
  }

  const event = await db.earlyAccessEvent.findFirst({
    where: {
      shopId,
      shopifyProductId: String(shopifyProductId),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // No Early Access event means the product is public.
  if (!event) {
    return {
      allowed: true,
      reason: "NO_EARLY_ACCESS_EVENT",
    };
  }

  const status = getEarlyAccessEventStatus(event);

  // Product is not currently restricted.
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

  // During VIP_ACTIVE, a logged-in customer must be VIP.
  if (!shopifyCustomerId) {
    return {
      allowed: false,
      reason: "VIP_CUSTOMER_REQUIRED",
      event,
    };
  }

  const { isCustomerVip } = await import(
    "./vip-status.server"
  );

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