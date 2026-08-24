
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import {
  getEarlyAccessEvents,
  checkEarlyAccessEligibility,
} from "../services/early-access.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const events = await getEarlyAccessEvents(shop.id);

  if (events.length === 0) {
    return {
      success: false,
      message: "No Early Access events found. Create one first.",
      events: [],
      results: [],
    };
  }

  const results = await Promise.all(
    events.map(async (event) => {
      const result = await checkEarlyAccessEligibility({
        shopId: shop.id,
        shopifyProductId: event.shopifyProductId,

        // No customer for now.
        // This tests guest access.
        shopifyCustomerId: null,
      });

      return {
        product: event.productTitleSnapshot,
        status: event.status,
        ...result,
      };
    }),
  );

  return {
    success: true,
    events,
    results,
  };
};

export default function EarlyAccessTestPage() {
  const data = useLoaderData();

  return (
    <s-page heading="Early Access Test">
      {!data.success ? (
        <s-section>
          <s-banner tone="warning">
            {data.message}
          </s-banner>
        </s-section>
      ) : (
        <s-section heading="Access Results">
          <s-stack direction="block" gap="base">
            {data.results.map((result, index) => (
              <s-box
                key={index}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-heading>
                    {result.product || "Product"}
                  </s-heading>

                  <s-text>
                    Event Status: {result.status}
                  </s-text>

                  <s-text>
                    Access Allowed:{" "}
                    {result.allowed ? "YES" : "NO"}
                  </s-text>

                  <s-text>
                    Reason: {result.reason}
                  </s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};