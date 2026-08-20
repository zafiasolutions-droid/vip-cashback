import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  let settings = await prisma.appSettings.findUnique({
    where: {
      shop: session.shop,
    },
  });

  // Agar merchant ne abhi cashback settings save nahi ki hain
  if (!settings) {
    settings = await prisma.appSettings.create({
      data: {
        shop: session.shop,
        cashbackPercentage: 1,
        minimumPurchaseAmount: 0,
      },
    });
  }

  return {
    cashbackPercentage: settings.cashbackPercentage,
  };
};

export default function Dashboard() {
  const { cashbackPercentage } = useLoaderData();

  return (
    <s-page heading="VIP Cashback">
      <s-section heading="Dashboard">
        <s-stack direction="inline" gap="base">
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="small">
              <s-text>Cashback Rate</s-text>

              <s-heading>
                {cashbackPercentage}%
              </s-heading>

              <s-text>
                Cashback on every eligible purchase
              </s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="small">
              <s-text>Total Cashback Issued</s-text>

              <s-heading>$0.00</s-heading>

              <s-text>
                Total cashback given to customers
              </s-text>
            </s-stack>
          </s-box>

          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="small">
              <s-text>Total Customers</s-text>

              <s-heading>0</s-heading>

              <s-text>
                Customers with cashback accounts
              </s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Cashback Program">
        <s-paragraph>
          Customers receive {cashbackPercentage}% cashback on every
          eligible purchase. Cashback is stored as account credit and
          can only be used on collections selected by the merchant.
        </s-paragraph>

        <s-button
          variant="primary"
          href="/app/cashback"
        >
          Configure Cashback
        </s-button>
      </s-section>

      <s-section heading="VIP Early Access">
        <s-paragraph>
          Give Twitch subscribers, high spenders, friends, and other
          selected customers early access to products before they are
          available to the public.
        </s-paragraph>

        <s-button variant="primary">
          Configure Early Access
        </s-button>
      </s-section>

      <s-section heading="Product Release Timer">
        <s-paragraph>
          Create a release timer for products and give selected VIP
          customers early access before the public release.
        </s-paragraph>

        <s-button variant="primary">
          Configure Release Timer
        </s-button>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};