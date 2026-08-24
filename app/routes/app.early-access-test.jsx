
import { useLoaderData, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import {
  getEarlyAccessEvents,
  checkEarlyAccessEligibility,
} from "../services/early-access.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  // Get selected customer ID from URL.
  const url = new URL(request.url);
  const shopifyCustomerId = url.searchParams.get("customerId");

  // Get Early Access events.
  const events = await getEarlyAccessEvents(shop.id);

  // Fetch real customers from Shopify.
  const response = await admin.graphql(`
    query {
      customers(first: 50) {
        nodes {
          id
          displayName
          email
        }
      }
    }
  `);

  const responseJson = await response.json();

  const customers = responseJson.data.customers.nodes;

  if (events.length === 0) {
    return {
      success: false,
      message: "No Early Access events found. Create one first.",
      events: [],
      customers,
      selectedCustomerId: shopifyCustomerId,
      results: [],
    };
  }

  // If no customer is selected, test as a guest.
  const results = await Promise.all(
    events.map(async (event) => {
      const result = await checkEarlyAccessEligibility({
        shopId: shop.id,
        shopifyProductId: event.shopifyProductId,
        shopifyCustomerId: shopifyCustomerId || null,
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
    customers,
    selectedCustomerId: shopifyCustomerId,
    results,
  };
};

export default function EarlyAccessTestPage() {
  const data = useLoaderData();

  return (
    <s-page heading="Early Access Test">
      <s-section heading="Select Customer">
        <Form method="get">
          <s-stack direction="block" gap="base">
            <select
              name="customerId"
              defaultValue={data.selectedCustomerId || ""}
              style={{
                padding: "10px",
                width: "100%",
              }}
            >
              <option value="">
                Guest / No Customer
              </option>

              {data.customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.displayName ||
                    customer.email ||
                    customer.id}
                </option>
              ))}
            </select>

            <button type="submit">
              Test Access
            </button>
          </s-stack>
        </Form>
      </s-section>

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
