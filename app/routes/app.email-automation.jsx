
import {
  useLoaderData,
  useActionData,
  Form,
} from "react-router";

import { authenticate } from "../shopify.server.js";
import { getOrCreateShop } from "../services/shop.server.js";
import db from "../db.server.js";

export const loader = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const shop =
    await getOrCreateShop(session.shop);

  const settings =
    await db.emailAutomationSettings.findUnique({
      where: {
        shopId: shop.id,
      },
    });

  return {
    settings,
  };
};

export const action = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const shop =
    await getOrCreateShop(session.shop);

  const formData =
    await request.formData();

  const enabled =
    formData.get("enabled") === "true";

  const subject =
    formData.get("subject");

  try {
    await db.emailAutomationSettings.upsert({
      where: {
        shopId: shop.id,
      },

      update: {
        earlyAccessEnabled: enabled,
        earlyAccessSubject:
          subject ||
          "VIP Early Access: {{product}} is live 🚀",
      },

      create: {
        shopId: shop.id,
        earlyAccessEnabled: enabled,
        earlyAccessSubject:
          subject ||
          "VIP Early Access: {{product}} is live 🚀",
      },
    });

    return {
      success: true,
      message:
        "Email automation settings saved successfully.",
    };
  } catch (error) {
    console.error(
      "EMAIL AUTOMATION SETTINGS ERROR:",
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

export default function EmailAutomationPage() {
  const { settings } =
    useLoaderData();

  const actionData =
    useActionData();

  const enabled =
    settings?.earlyAccessEnabled ?? true;

  const subject =
    settings?.earlyAccessSubject ??
    "VIP Early Access: {{product}} is live 🚀";

  return (
    <s-page heading="Email Automation">

      <s-section
        heading="VIP Early Access Email"
      >

        <s-paragraph>
          Automatically send an email to eligible VIP
          customers when a product becomes available
          for VIP Early Access.
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

            <label>
              <input
                type="checkbox"
                name="enabled"
                value="true"
                defaultChecked={enabled}
              />

              {" "}
              Enable VIP Early Access emails
            </label>

          </div>

          <div
            style={{
              marginTop: "20px",
            }}
          >

            <label htmlFor="subject">
              Email Subject
            </label>

            <br />

            <input
              id="subject"
              name="subject"
              type="text"
              defaultValue={subject}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "8px",
              }}
            />

            <p
              style={{
                marginTop: "8px",
                color: "#666",
              }}
            >
              Use {"{{product}}"} to automatically
              insert the product name.
            </p>

          </div>

          <div
            style={{
              marginTop: "20px",
            }}
          >

            <button type="submit">
              Save Email Settings
            </button>

          </div>

        </Form>

      </s-section>

    </s-page>
  );
}

