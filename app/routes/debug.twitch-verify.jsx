import {
  getCustomerVipStatus,
} from "../services/vip-status.server";

export const loader = async () => {
  try {
    const result = await getCustomerVipStatus({
      shopId: 1,
      shopifyCustomerId: "9734410338626",
    });

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("VIP status test error:", error);

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
};