import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import { getEarlyAccessEvents } from "../services/early-access.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Make sure this Shopify store exists in our database
  const shop = await getOrCreateShop(session.shop);

  // Get products from Shopify
  const response = await admin.graphql(`
    query {
      products(first: 50) {
        nodes {
          id
          title
          status
          featuredImage {
            url
            altText
          }
        }
      }
    }
  `);

  const responseJson = await response.json();

  const products = responseJson.data.products.nodes;

  // Get existing Early Access events
  const events = await getEarlyAccessEvents(shop.id);

  return {
    products,
    events: events.map((event) => ({
      ...event,
      vipStartAt: event.vipStartAt.toISOString(),
      publicReleaseAt: event.publicReleaseAt.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    })),
  };
};

export default function EarlyAccessPage() {
  const { products, events } = useLoaderData();

  return (
    <s-page heading="Early Access">
      <s-section heading="Create Early Access Event">
        <s-paragraph>
          Select a product and configure when VIP customers and the
          public can access it.
        </s-paragraph>

        <s-stack direction="block" gap="base">
          <s-text>
            Available Products: {products.length}
          </s-text>

          {products.length === 0 ? (
            <s-text>
              No products found in this Shopify store.
            </s-text>
          ) : (
            products.map((product) => (
              <s-box
                key={product.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-heading>{product.title}</s-heading>

                  <s-text>
                    Status: {product.status}
                  </s-text>

                  <s-text>
                    Shopify Product ID: {product.id}
                  </s-text>
                </s-stack>
              </s-box>
            ))
          )}
        </s-stack>
      </s-section>

      <s-section heading="Existing Early Access Events">
        {events.length === 0 ? (
          <s-paragraph>
            No Early Access events have been created yet.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {events.map((event) => (
              <s-box
                key={event.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-heading>
                    {event.productTitleSnapshot || "Untitled Product"}
                  </s-heading>

                  <s-text>
                    VIP Start: {new Date(event.vipStartAt).toLocaleString()}
                  </s-text>

                  <s-text>
                    Public Release:{" "}
                    {new Date(event.publicReleaseAt).toLocaleString()}
                  </s-text>

                  <s-text>
                    Status: {event.status}
                  </s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};