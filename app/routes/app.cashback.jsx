import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  let settings = await prisma.appSettings.findUnique({
    where: {
      shop: session.shop,
    },
  });

  if (!settings) {
    settings = await prisma.appSettings.create({
      data: {
        shop: session.shop,
        cashbackPercentage: 1,
        excludedProductIds: "",
        excludedCollectionIds: "",
      },
    });
  }

  const response = await admin.graphql(`
    query {
      products(first: 50) {
        nodes {
          id
          title
        }
      }

      collections(first: 50) {
        nodes {
          id
          title
        }
      }
    }
  `);

  const data = await response.json();

  return {
    cashbackPercentage: settings.cashbackPercentage,
    excludedProductIds: settings.excludedProductIds ?? "",
    excludedCollectionIds: settings.excludedCollectionIds ?? "",
    products: data.data.products.nodes,
    collections: data.data.collections.nodes,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();

  const cashbackPercentage = Number(
    formData.get("cashbackPercentage"),
  );

  const excludedProductIds = String(
    formData.get("excludedProductIds") ?? "",
  ).trim();

  const excludedCollectionIds = String(
    formData.get("excludedCollectionIds") ?? "",
  ).trim();

  if (
    !Number.isFinite(cashbackPercentage) ||
    cashbackPercentage < 0 ||
    cashbackPercentage > 100
  ) {
    return {
      error: "Cashback percentage must be between 0% and 100%.",
    };
  }

  await prisma.appSettings.upsert({
    where: {
      shop: session.shop,
    },
    update: {
      cashbackPercentage,
      excludedProductIds,
      excludedCollectionIds,
    },
    create: {
      shop: session.shop,
      cashbackPercentage,
      excludedProductIds,
      excludedCollectionIds,
    },
  });

  return {
    success: true,
    cashbackPercentage,
    excludedProductIds,
    excludedCollectionIds,
  };
};

export default function CashbackSettings() {
  const settings = useLoaderData();
  const fetcher = useFetcher();

  const isSaving =
    fetcher.state === "submitting" ||
    fetcher.state === "loading";

  const currentPercentage =
    fetcher.data?.cashbackPercentage ??
    settings.cashbackPercentage;

  const selectedProduct =
    fetcher.data?.excludedProductIds ??
    settings.excludedProductIds;

  const selectedCollection =
    fetcher.data?.excludedCollectionIds ??
    settings.excludedCollectionIds;

  return (
    <s-page heading="Cashback Settings">
      <s-section heading="Cashback Program">
        <fetcher.Form method="POST">
          <s-stack direction="block" gap="base">
            <s-text>
              Configure the percentage of every customer purchase
              that will be given as cashback.
            </s-text>

            <s-text-field
              name="cashbackPercentage"
              label="Cashback Percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={String(currentPercentage)}
              help-text="Example: 5 means the customer receives 5% cashback on every eligible purchase."
            />

            <div>
              <label
                htmlFor="excludedProductIds"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "600",
                }}
              >
                Excluded Product
              </label>

              <select
                id="excludedProductIds"
                name="excludedProductIds"
                defaultValue={selectedProduct}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #8c9196",
                }}
              >
                <option value="">
                  Select a product to exclude
                </option>

                {settings.products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="excludedCollectionIds"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "600",
                }}
              >
                Excluded Collection
              </label>

              <select
                id="excludedCollectionIds"
                name="excludedCollectionIds"
                defaultValue={selectedCollection}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #8c9196",
                }}
              >
                <option value="">
                  Select a collection to exclude
                </option>

                {settings.collections.map((collection) => (
                  <option
                    key={collection.id}
                    value={collection.id}
                  >
                    {collection.title}
                  </option>
                ))}
              </select>
            </div>

            <s-button
              type="submit"
              variant="primary"
              {...(isSaving ? { loading: true } : {})}
            >
              Save Settings
            </s-button>

            {fetcher.data?.success && (
              <s-banner tone="success">
                Cashback settings saved successfully.
              </s-banner>
            )}

            {fetcher.data?.error && (
              <s-banner tone="critical">
                {fetcher.data.error}
              </s-banner>
            )}
          </s-stack>
        </fetcher.Form>
      </s-section>

      <s-section heading="How Cashback Works">
        <s-stack direction="block" gap="small">
          <s-text>
            Customers receive the configured percentage of every
            eligible purchase as cashback credit.
          </s-text>

          <s-text>
            Example: At {currentPercentage}% cashback, a $100
            eligible purchase gives the customer $
            {(100 * Number(currentPercentage || 0)) / 100}
            {" "}in cashback.
          </s-text>

          <s-text>
            The selected product or collection will not earn cashback.
          </s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};