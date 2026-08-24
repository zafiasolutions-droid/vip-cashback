import db from "../db.server";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import {
  calculateCustomerEligibleSpending,
  upsertOrderSpendingRecord,
} from "../services/order-spending.server";
import {
  updateAndEvaluateCustomerSpending,
} from "../services/customer-spending.server";

/**
 * Shopify Refunds Create Webhook
 */
export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } =
      await authenticate.webhook(request);

    console.log(`Received webhook: ${topic}`);

    const localShop = await getOrCreateShop(shop);

    // A refund payload contains the order ID,
    // but we need the existing order record.
    if (!payload.order_id) {
      console.error("Refund received without order ID");

      return new Response(null, {
        status: 200,
      });
    }

    const orderRecord =
      await db.orderSpendingRecord.findUnique({
        where: {
          shopId_shopifyOrderId: {
            shopId: localShop.id,
            shopifyOrderId: String(payload.order_id),
          },
        },
      });

    if (!orderRecord) {
      console.error(
        `No spending record found for refunded order ${payload.order_id}`,
      );

      return new Response(null, {
        status: 200,
      });
    }

    // Calculate total refunded amount.
    const refundedAmount =
      (payload.transactions || [])
        .filter(
          (transaction) =>
            transaction.kind === "refund" &&
            transaction.status === "success",
        )
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount || 0),
          0,
        );

    const newEligibleAmount = Math.max(
      0,
      orderRecord.eligibleAmount - refundedAmount,
    );

    await upsertOrderSpendingRecord({
      shopId: localShop.id,
      customerId: orderRecord.customerId,
      shopifyOrderId: payload.order_id,
      eligibleAmount: newEligibleAmount,
      currency:
        payload.currency ||
        orderRecord.currency ||
        localShop.currency ||
        null,
      financialStatus:
        orderRecord.financialStatus || null,
      cancelledAt: orderRecord.cancelledAt,
    });

    const totalEligibleAmount =
      await calculateCustomerEligibleSpending({
        shopId: localShop.id,
        customerId: orderRecord.customerId,
      });

    const result =
      await updateAndEvaluateCustomerSpending({
        customerId: orderRecord.customerId,
        shopId: localShop.id,
        eligibleAmount: totalEligibleAmount,
      });

    console.log(
      `Refund processed for order ${payload.order_id}`,
      {
        refundedAmount,
        totalEligibleAmount,
        isVip: result.vip?.isVip,
      },
    );

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Refund create webhook error:",
      error,
    );

    return new Response(null, {
      status: 500,
    });
  }
};