import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/shop.server";
import { syncCustomerSpending } from "../services/order-spending.server";

/**
 * Shopify Orders Updated Webhook
 */
export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } =
      await authenticate.webhook(request);

    console.log(`Received webhook: ${topic}`);

    const localShop = await getOrCreateShop(shop);

    // Guest orders cannot qualify for Spending VIP.
    if (!payload.customer?.id) {
      return new Response(null, {
        status: 200,
      });
    }

    // Every order must have a Shopify order ID.
    if (!payload.id) {
      console.error("Webhook received without order ID");

      return new Response(null, {
        status: 200,
      });
    }

    const eligibleAmount = Number(
      payload.current_total_price ||
      payload.total_price ||
      0,
    );

    if (Number.isNaN(eligibleAmount) || eligibleAmount < 0) {
      console.error(
        "Invalid order spending amount",
        payload.id,
      );

      return new Response(null, {
        status: 200,
      });
    }

    const result = await syncCustomerSpending({
      shopId: localShop.id,

      customer: {
        id: payload.customer.id,
        email: payload.customer.email,
        firstName: payload.customer.first_name,
        lastName: payload.customer.last_name,
      },

      shopifyOrderId: payload.id,
      eligibleAmount,

      currency:
        payload.currency ||
        localShop.currency ||
        null,

      financialStatus:
        payload.financial_status || null,

      cancelledAt:
        payload.cancelled_at || null,
    });

    console.log(
      `Order ${payload.id} updated successfully`,
      {
        customerId: result.customer?.id,
        totalEligibleAmount:
          result.totalEligibleAmount,
        isVip: result.vip?.isVip,
      },
    );

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Orders updated webhook error:",
      error,
    );

    return new Response(null, {
      status: 500,
    });
  }
};