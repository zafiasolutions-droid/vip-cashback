import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  return {
    shopDomain: shop.domain,
  };
};

export default function Dashboard() {
  const { shopDomain } = useLoaderData();

  return (
    <s-page heading="VIP Early Access">
      <s-section heading="Dashboard">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Your VIP Early Access system is ready to be configured.
          </s-paragraph>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="small">
              <s-text>Connected Store</s-text>

              <s-heading>{shopDomain}</s-heading>

              <s-text>
                This store is connected to your VIP Early Access system.
              </s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Coming Next">
        <s-stack direction="block" gap="small">
          <s-text>Product Early Access</s-text>
          <s-text>VIP Customer Management</s-text>
          <s-text>Twitch Subscriber Verification</s-text>
          <s-text>Spending-Based VIP Access</s-text>
          <s-text>Email Automation</s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};