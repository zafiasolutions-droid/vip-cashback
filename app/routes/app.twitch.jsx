import { useLoaderData, useActionData, Form } from "react-router";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import db from "../db.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const twitchChannel =
    await db.twitchChannel.findUnique({
      where: {
        shopId: shop.id,
      },
    });

  return {
    twitchChannel,
  };
};

export const action = async ({ request }) => {
  const { session } =
    await authenticate.admin(request);

  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();

  const channelLogin = formData
    .get("channelLogin")
    ?.trim()
    .toLowerCase();

  if (!channelLogin) {
    return {
      success: false,
      message: "Please enter a Twitch channel login.",
    };
  }

  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      "TWITCH_CLIENT_ID is missing",
    );
  }

  try {
    // Get a Twitch App Access Token.
    const tokenResponse = await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: new URLSearchParams({
          client_id: clientId,
          client_secret:
            process.env.TWITCH_CLIENT_SECRET,
          grant_type: "client_credentials",
        }),
      },
    );

    const tokenData =
      await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Twitch app token error:",
        tokenData,
      );

      throw new Error(
        "Failed to authenticate with Twitch",
      );
    }

    // Find the Twitch channel by login.
    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(
        channelLogin,
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`,

          "Client-Id": clientId,
        },
      },
    );

    const userData =
      await userResponse.json();

    if (!userResponse.ok) {
      console.error(
        "Twitch channel lookup error:",
        userData,
      );

      throw new Error(
        "Failed to find Twitch channel",
      );
    }

    const twitchUser = userData.data?.[0];

    if (!twitchUser) {
      return {
        success: false,
        message: "Twitch channel not found.",
      };
    }

    // Save/update this merchant's Twitch channel.
    await db.twitchChannel.upsert({
      where: {
        shopId: shop.id,
      },

      update: {
        twitchUserId: String(twitchUser.id),
        login: twitchUser.login,
        displayName:
          twitchUser.display_name || null,
      },

      create: {
        shopId: shop.id,
        twitchUserId: String(twitchUser.id),
        login: twitchUser.login,
        displayName:
          twitchUser.display_name || null,
      },
    });

    return {
      success: true,
      message: "Twitch channel saved successfully.",
    };
  } catch (error) {
    console.error(
      "Twitch channel save error:",
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

export default function TwitchSettingsPage() {
  const { twitchChannel } = useLoaderData();
  const actionData = useActionData();

  return (
    <s-page heading="Twitch Settings">

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

      <s-section heading="Merchant Twitch Channel">
        <s-paragraph>
          Enter the Twitch username of the channel
          whose subscribers should receive VIP access.
        </s-paragraph>

        <Form method="post">
          <s-stack direction="block" gap="base">

            <input
              type="text"
              name="channelLogin"
              defaultValue={
                twitchChannel?.login || ""
              }
              placeholder="example_channel"
            />

            <button type="submit">
              Save Channel
            </button>

          </s-stack>
        </Form>
      </s-section>

      {twitchChannel && (
        <s-section heading="Current Channel">
          <s-stack direction="block" gap="small">
            <s-text>
              Channel: {twitchChannel.displayName}
            </s-text>

            <s-text>
              Login: {twitchChannel.login}
            </s-text>

            <s-text>
              Twitch ID: {twitchChannel.twitchUserId}
            </s-text>
          </s-stack>
        </s-section>
      )}

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};