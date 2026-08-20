import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, topic, shop, admin } =
    await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  try {
    const order = payload;

    if (!order.customer?.id) {
      console.log(
        `Skipping cashback for order ${order.id}: customer not found.`
      );

      return new Response();
    }

    const orderId = String(order.id);
    const shopifyCustomerId = String(order.customer.id);

    const settings = await db.appSettings.findUnique({
      where: {
        shop,
      },
    });

    if (!settings) {
      console.log(`No cashback settings found for ${shop}.`);
      return new Response();
    }

    const cashbackPercentage = Number(
      settings.cashbackPercentage || 0
    );

    if (
      !Number.isFinite(cashbackPercentage) ||
      cashbackPercentage <= 0
    ) {
      console.log(
        `Cashback is disabled for ${shop}.`
      );

      return new Response();
    }

    const excludedProductIds = String(
      settings.excludedProductIds ?? ""
    )
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const excludedCollectionIds = String(
      settings.excludedCollectionIds ?? ""
    )
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const lineItems = order.line_items ?? [];

    let eligibleAmount = 0;

    for (const item of lineItems) {
      const productId = item.product_id
        ? `gid://shopify/Product/${item.product_id}`
        : null;

      // Product directly excluded hai.
      if (
        productId &&
        excludedProductIds.includes(productId)
      ) {
        console.log(
          `Product excluded: ${item.title}`
        );

        continue;
      }

      let productIsInExcludedCollection = false;

      // Product ki collections Shopify se check karo.
      if (
        productId &&
        excludedCollectionIds.length > 0
      ) {
        const response = await admin.graphql(
          `
          query GetProductCollections($id: ID!) {
            product(id: $id) {
              collections(first: 100) {
                nodes {
                  id
                }
              }
            }
          }
          `,
          {
            variables: {
              id: productId,
            },
          }
        );

        const data = await response.json();

        const productCollections =
          data?.data?.product?.collections?.nodes ?? [];

        productIsInExcludedCollection =
          productCollections.some((collection) =>
            excludedCollectionIds.includes(collection.id)
          );

        if (productIsInExcludedCollection) {
          console.log(
            `Product "${item.title}" belongs to an excluded collection.`
          );

          continue;
        }
      }

      const itemAmount =
        Number(item.price ?? 0) *
        Number(item.quantity ?? 0);

      if (
        Number.isFinite(itemAmount) &&
        itemAmount > 0
      ) {
        eligibleAmount += itemAmount;
      }
    }

    // Agar koi eligible product nahi hai.
    if (
      !Number.isFinite(eligibleAmount) ||
      eligibleAmount <= 0
    ) {
      console.log(
        `No eligible products for cashback in order ${orderId}.`
      );

      return new Response();
    }

    const cashbackAmount =
      (eligibleAmount * cashbackPercentage) / 100;

    if (
      !Number.isFinite(cashbackAmount) ||
      cashbackAmount <= 0
    ) {
      console.log(
        `Invalid cashback amount for order ${orderId}.`
      );

      return new Response();
    }

    const email =
      order.customer.email ||
      order.email ||
      null;

    const firstName =
      order.customer.first_name ||
      null;

    const lastName =
      order.customer.last_name ||
      null;

    await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: {
          shop_shopifyCustomerId: {
            shop,
            shopifyCustomerId,
          },
        },
        update: {
          email,
          firstName,
          lastName,
        },
        create: {
          shop,
          shopifyCustomerId,
          email,
          firstName,
          lastName,
          cashbackBalance: 0,
        },
      });

      const existingLedger =
        await tx.cashbackLedger.findFirst({
          where: {
            shop,
            orderId,
            type: "EARN",
          },
        });

      if (existingLedger) {
        console.log(
          `Cashback already processed for order ${orderId}.`
        );

        return;
      }

      await tx.customer.update({
        where: {
          id: customer.id,
        },
        data: {
          cashbackBalance: {
            increment: cashbackAmount,
          },
        },
      });

      await tx.cashbackLedger.create({
        data: {
          customerId: customer.id,
          shop,
          type: "EARN",
          amount: cashbackAmount,
          orderId,
          description:
            `${cashbackPercentage}% cashback earned from eligible products`,
        },
      });

      console.log(
        `Cashback added: ${cashbackAmount} for customer ${shopifyCustomerId}. Eligible amount: ${eligibleAmount}`
      );
    });

    return new Response();
  } catch (error) {
    console.error(
      `Error processing orders/paid webhook for ${shop}:`,
      error
    );

    return new Response(
      "Webhook processing failed",
      {
        status: 500,
      }
    );
  }
};