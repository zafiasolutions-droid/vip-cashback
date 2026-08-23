import { useLoaderData, useActionData, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import {
  createEarlyAccessEvent,
  getEarlyAccessEvents,
} from "../services/early-access.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const response = await admin.graphql(`
    query {
      products(first: 50) {
        nodes {
          id
          title
          status
        }
      }
    }
  `);

  const responseJson = await response.json();

  const products = responseJson.data.products.nodes;

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

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();

  const shopifyProductId = formData.get("shopifyProductId");
  const vipStartAt = formData.get("vipStartAt");
  const publicReleaseAt = formData.get("publicReleaseAt");

  const productTitle = formData.get("productTitle");

  try {
    await createEarlyAccessEvent({
      shopId: shop.id,
      shopifyProductId,
      productTitleSnapshot: productTitle,
      vipStartAt,
      publicReleaseAt,
    });

    return {
      success: true,
      message: "Early Access event created successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

export default function EarlyAccessPage() {
  const { products, events } = useLoaderData();
  const actionData = useActionData();

  return (
    <s-page heading="Early Access">
      <s-section heading="Create Early Access Event">
        <s-paragraph>
          Select a product and configure when VIP customers and the
          public can access it.
        </s-paragraph>

        {actionData?.message && (
          <s-banner
            tone={actionData.success ? "success" : "critical"}
          >
            {actionData.message}
          </s-banner>
        )}

        <Form method="post">
          <s-stack direction="block" gap="base">
            <s-select
              label="Select Product"
              name="shopifyProductId"
              required
            >
              <option value="">Select a product</option>

              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                  data-title={product.title}
                >
                  {product.title}
                </option>
              ))}
            </s-select>

            <input
              type="hidden"
              name="productTitle"
              value=""
            />

            <s-text-field
              label="VIP Access Start"
              name="vipStartAt"
              type="datetime-local"
              required
            />

            <s-text-field
              label="Public Release"
              name="publicReleaseAt"
              type="datetime-local"
              required
            />

            <s-button type="submit" variant="primary">
              Create Early Access Event
            </s-button>
          </s-stack>
        </Form>
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
                    {event.productTitleSnapshot || "Product"}
                  </s-heading>

                  <s-text>
                    VIP Access:{" "}
                    {new Date(event.vipStartAt).toLocaleString()}
                  </s-text>

                  <s-text>
                    Public Release:{" "}
                    {new Date(
                      event.publicReleaseAt,
                    ).toLocaleString()}
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