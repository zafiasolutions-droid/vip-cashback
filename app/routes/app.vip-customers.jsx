import { useLoaderData, useActionData, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import {
  createOrUpdateCustomer,
  grantManualVip,
  revokeManualVip,
  getManualVipCustomers,
} from "../services/vip.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const response = await admin.graphql(`
    query {
      customers(first: 100) {
        nodes {
          id
          email
          firstName
          lastName
        }
      }
    }
  `);

  const responseJson = await response.json();

  const shopifyCustomers =
    responseJson.data?.customers?.nodes || [];

  // Get current Manual VIP customers from our database.
  const manualVipCustomers =
    await getManualVipCustomers(shop.id);

  const manualVipCustomerIds = new Set(
    manualVipCustomers.map(
      (customer) => customer.shopifyCustomerId,
    ),
  );

  return {
    customers: shopifyCustomers.map((customer) => ({
      ...customer,
      isManualVip: manualVipCustomerIds.has(customer.id),
    })),
    manualVipCustomers,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();

  const intent = formData.get("intent");

  const shopifyCustomerId =
    formData.get("shopifyCustomerId");

  if (!shopifyCustomerId) {
    return {
      success: false,
      message: "Customer ID is required.",
    };
  }

  try {
    // Find customer details from the submitted form.
    const customer = await createOrUpdateCustomer({
      shopId: shop.id,
      shopifyCustomerId,
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
    });

    if (intent === "grant") {
      await grantManualVip(customer.id);

      return {
        success: true,
        message: "Manual VIP access granted successfully.",
      };
    }

    if (intent === "revoke") {
      await revokeManualVip(customer.id);

      return {
        success: true,
        message: "Manual VIP access removed successfully.",
      };
    }

    return {
      success: false,
      message: "Invalid action.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error.message || "Something went wrong.",
    };
  }
};

export default function VipCustomersPage() {
  const { customers, manualVipCustomers } =
    useLoaderData();

  const actionData = useActionData();

  return (
    <s-page heading="VIP Customers">

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

      <s-section heading="Manual VIP Management">
        <s-paragraph>
          Grant or remove VIP access manually.
          Manual VIP remains active until you remove it.
        </s-paragraph>
      </s-section>

      <s-section heading="Shopify Customers">
        {customers.length === 0 ? (
          <s-paragraph>
            No customers found in your Shopify store.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">

            {customers.map((customer) => (
              <s-box
                key={customer.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack
                  direction="inline"
                  gap="base"
                  alignItems="center"
                >
                  <s-stack direction="block" gap="small">
                    <s-heading>
                      {customer.firstName ||
                      customer.lastName
                        ? `${customer.firstName || ""} ${
                            customer.lastName || ""
                          }`.trim()
                        : "Unnamed Customer"}
                    </s-heading>

                    <s-text>
                      {customer.email ||
                        "No email address"}
                    </s-text>

                    <s-text>
                      Status:{" "}
                      {customer.isManualVip
                        ? "Manual VIP"
                        : "Regular Customer"}
                    </s-text>
                  </s-stack>

                  <Form method="post">
                    <input
                      type="hidden"
                      name="shopifyCustomerId"
                      value={customer.id}
                    />

                    <input
                      type="hidden"
                      name="email"
                      value={customer.email || ""}
                    />

                    <input
                      type="hidden"
                      name="firstName"
                      value={customer.firstName || ""}
                    />

                    <input
                      type="hidden"
                      name="lastName"
                      value={customer.lastName || ""}
                    />

                    <input
                      type="hidden"
                      name="intent"
                      value={
                        customer.isManualVip
                          ? "revoke"
                          : "grant"
                      }
                    />

                    <button type="submit">
                      {customer.isManualVip
                        ? "Remove VIP"
                        : "Make VIP"}
                    </button>
                  </Form>
                </s-stack>
              </s-box>
            ))}

          </s-stack>
        )}
      </s-section>

      <s-section heading="Current Manual VIP Customers">
        {manualVipCustomers.length === 0 ? (
          <s-paragraph>
            No Manual VIP customers yet.
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {manualVipCustomers.map((customer) => (
              <s-box
                key={customer.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-heading>
                  {customer.firstName ||
                  customer.lastName
                    ? `${customer.firstName || ""} ${
                        customer.lastName || ""
                      }`.trim()
                    : "Unnamed Customer"}
                </s-heading>

                <s-text>
                  {customer.email || "No email"}
                </s-text>
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