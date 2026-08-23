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

  const selectedProduct = formData.get("product");

  const vipStartAt = formData.get("vipStartAt");
  const publicReleaseAt = formData.get("publicReleaseAt");

  if (!selectedProduct) {
    return {
      success: false,
      message: "Please select a product.",
    };
  }

  const [shopifyProductId, productTitle] = selectedProduct.split("|||");

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
      message: error.message || "Something went wrong.",
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
          <div style={{ marginTop: "20px" }}>
            <label htmlFor="product">
              Select Product
            </label>

            <br />

            <select
              id="product"
              name="product"
              required
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
              }}
            >
              <option value="">
                Select a product
              </option>

              {products.map((product) => (
                <option
                  key={product.id}
                  value={`${product.id}|||${product.title}`}
                >
                  {product.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label htmlFor="vipStartAt">
              VIP Access Start
            </label>

            <br />

            <input
              id="vipStartAt"
              name="vipStartAt"
              type="datetime-local"
              required
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
              }}
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <label htmlFor="publicReleaseAt">
              Public Release
            </label>

            <br />

            <input
              id="publicReleaseAt"
              name="publicReleaseAt"
              type="datetime-local"
              required
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
              }}
            />
          </div>

          <div style={{ marginTop: "20px" }}>
            <button type="submit">
              Create Early Access Event
            </button>
          </div>
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