

import {
  useLoaderData,
  useActionData,
  Form,
} from "react-router";

import { authenticate } from "../shopify.server";

import { getOrCreateShop } from "../services/shop.server";

import db from "../db.server";

import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { admin, session } =
    await authenticate.admin(request);

  const response =
    await admin.graphql(`
      query {
        collections(first: 100) {
          nodes {
            id
            title
          }
        }
      }
    `);

  const responseJson =
    await response.json();

  const collections =
    responseJson.data.collections.nodes;

  const shop =
    await getOrCreateShop(session.shop);

  const selectedCollections =
    await db.earlyAccessCollection.findMany({
      where: {
        shopId: shop.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  return {
    collections,
    selectedCollections,
  };
};

export const action = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const shop =
    await getOrCreateShop(session.shop);

  const formData =
    await request.formData();

  const selectedCollection =
    formData.get("collection");

  if (!selectedCollection) {
    return {
      success: false,
      message: "Please select a collection.",
    };
  }

  const [
    shopifyCollectionId,
    collectionTitle,
  ] = selectedCollection.split("|||");

  try {
    await db.earlyAccessCollection.upsert({
      where: {
        shopId_shopifyCollectionId: {
          shopId: shop.id,
          shopifyCollectionId,
        },
      },

      update: {
        titleSnapshot: collectionTitle,
        enabled: true,
      },

      create: {
        shopId: shop.id,
        shopifyCollectionId,
        titleSnapshot: collectionTitle,
        enabled: true,
      },
    });

    return {
      success: true,
      message:
        "VIP Early Access collection saved successfully.",
    };
  } catch (error) {
    console.error(
      "Early Access collection error:",
      error,
    );

    return {
      success: false,
      message:
        error.message ||
        "Something went wrong.",
    };
  }
};

export default function EarlyAccessPage() {
  const {
    collections,
    selectedCollections,
  } = useLoaderData();

  const actionData =
    useActionData();

  return (
    <s-page heading="VIP Early Access">

      <s-section heading="Select VIP Collection">

        <s-paragraph>
          Select a collection for VIP Early Access.
          When a new product is added to this collection,
          VIP customers will automatically receive
          Early Access before the product becomes public.
        </s-paragraph>

        {actionData?.message && (
          <s-banner
            tone={
              actionData.success
                ? "success"
                : "critical"
            }
          >
            {actionData.message}
          </s-banner>
        )}

        <Form method="post">

          <div
            style={{
              marginTop: "20px",
            }}
          >

            <label htmlFor="collection">
              Select Collection
            </label>

            <br />

            <select
              id="collection"
              name="collection"
              required
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
              }}
            >

              <option value="">
                Select a collection
              </option>

              {collections.map(
                (collection) => (
                  <option
                    key={collection.id}
                    value={`${collection.id}|||${collection.title}`}
                  >
                    {collection.title}
                  </option>
                ),
              )}

            </select>

          </div>

          <div
            style={{
              marginTop: "20px",
            }}
          >
            <button type="submit">
              Enable VIP Early Access
            </button>
          </div>

        </Form>

      </s-section>

      <s-section heading="VIP Early Access Collections">

        {selectedCollections.length === 0 ? (

          <s-paragraph>
            No VIP Early Access collections selected yet.
          </s-paragraph>

        ) : (

          <s-stack
            direction="block"
            gap="base"
          >

            {selectedCollections.map(
              (collection) => (

                <s-box
                  key={collection.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >

                  <s-stack
                    direction="block"
                    gap="small"
                  >

                    <s-heading>
                      {collection.titleSnapshot ||
                        "Collection"}
                    </s-heading>

                    <s-text>
                      Status:{" "}
                      {collection.enabled
                        ? "ACTIVE"
                        : "DISABLED"}
                    </s-text>

                  </s-stack>

                </s-box>

              ),
            )}

          </s-stack>

        )}

      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};