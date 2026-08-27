import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import {
  checkEarlyAccessEligibility,
  getEarlyAccessEventStatus,
} from "../services/early-access.server";

export const loader = async ({ request }) => {
  try {
    // Verify that this request came through
    // the Shopify App Proxy.
    const { session } =
      await authenticate.public.appProxy(request);

    const shop =
      await getOrCreateShop(session.shop);

    const url = new URL(request.url);

    const productId =
      url.searchParams.get("product_id");

    if (!productId) {
      return Response.json(
        {
          allowed: true,
          reason: "NO_PRODUCT_ID",
          status: null,
        },
        { status: 400 },
      );
    }

    // Shopify App Proxy provides the logged-in
    // customer ID when available.
    const shopifyCustomerId =
      url.searchParams.get(
        "logged_in_customer_id",
      );

    console.log("VIP Access Debug:", {
      productId,
      shopifyCustomerId,
      url: request.url,
    });

    const result =
      await checkEarlyAccessEligibility({
        shopId: shop.id,
        shopifyProductId: productId,
        shopifyCustomerId:
          shopifyCustomerId || null,
      });

    const status = result.event
  ? getEarlyAccessEventStatus(
      result.event,
    )
  : null;

const publicReleaseAt =
  result.event?.publicReleaseAt
    ? result.event.publicReleaseAt.toISOString()
    : null;

const remainingSeconds =
  publicReleaseAt && status === "VIP_ACTIVE"
    ? Math.max(
        0,
        Math.floor(
          (new Date(publicReleaseAt).getTime() -
            Date.now()) /
            1000,
        ),
      )
    : 0;

return Response.json({
  allowed: result.allowed,
  reason: result.reason,
  status,
  publicReleaseAt,
  remainingSeconds,
});

  } catch (error) {
    console.error(
      "VIP Access App Proxy Error:",
      error,
    );

    return Response.json(
      {
        allowed: false,
        reason: "SERVER_ERROR",
        status: null,
      },
      { status: 500 },
    );
  }
};