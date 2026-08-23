import { useLoaderData, useActionData, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import {
  getSpendingRule,
  updateSpendingRule,
} from "../services/spending.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
 const { admin, session } = await authenticate.admin(request);

const response = await admin.graphql(`
  query {
    shop {
      currencyCode
    }
  }
`);

const data = await response.json();

const currency = data.data.shop.currencyCode;

const shop = await getOrCreateShop(
  session.shop,
  currency,
);

  const rule = await getSpendingRule(shop.id);

  return {
  currency: shop.currency || "USD",

  rule: {
    enabled: rule.enabled,
    threshold: rule.threshold,
    mode: rule.mode,
  },
};
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();

  const enabled = formData.get("enabled") === "true";
  const threshold = formData.get("threshold");
  const mode = formData.get("mode");

  try {
    const rule = await updateSpendingRule({
      shopId: shop.id,
      enabled,
      threshold,
      mode,
    });

    return {
      success: true,
      message: "Spending VIP settings saved successfully.",
      rule: {
        enabled: rule.enabled,
        threshold: rule.threshold,
        mode: rule.mode,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error.message || "Failed to save Spending VIP settings.",
    };
  }
};

export default function SpendingPage() {
  const { rule } = useLoaderData();
  const actionData = useActionData();

  return (
    <s-page heading="Spending VIP">

      {actionData?.message && (
        <s-banner
          tone={actionData.success ? "success" : "critical"}
        >
          {actionData.message}
        </s-banner>
      )}

      <s-section heading="Spending VIP Settings">
        <s-paragraph>
          Customers can automatically receive VIP access based on
          their eligible spending amount.
        </s-paragraph>

        <Form method="post">
          <div style={{ marginTop: "20px" }}>
            <label>
              <input
                type="checkbox"
                name="enabled"
                value="true"
                defaultChecked={rule.enabled}
              />{" "}
              Enable Spending VIP
            </label>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label htmlFor="threshold">
              Spending Threshold
            </label>

            <br />

            <input
              id="threshold"
              name="threshold"
              type="number"
              min="0"
              step="0.01"
              defaultValue={rule.threshold}
              required
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
              }}
            />

            <p>
              Example: Enter 500 to make customers VIP after
              reaching $500 in eligible spending.
            </p>
          </div>

          <div style={{ marginTop: "20px" }}>
            <label htmlFor="mode">
              VIP Mode
            </label>

            <br />

            <select
              id="mode"
              name="mode"
              defaultValue={rule.mode}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
              }}
            >
              <option value="PERMANENT">
                Permanent
              </option>

              <option value="DYNAMIC">
                Dynamic
              </option>
            </select>

            <div style={{ marginTop: "12px" }}>
              <strong>Permanent:</strong>
              <p>
                Once a customer reaches the threshold, they remain
                VIP even if their eligible spending later decreases.
              </p>

              <strong>Dynamic:</strong>
              <p>
                A customer remains VIP only while their eligible
                spending is at or above the threshold.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <button type="submit">
              Save Spending VIP Settings
            </button>
          </div>
        </Form>
      </s-section>

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};