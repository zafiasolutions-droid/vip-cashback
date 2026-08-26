
import {
  getCustomerVipStatus,
} from "../services/vip-status.server.js";

export const loader = async () => {
  try {
    const vipStatus =
      await getCustomerVipStatus({
        shopId: 1,
        shopifyCustomerId:
          "9734410338626",
      });

    return Response.json({
      success: true,

      isVip: vipStatus.isVip,

      reasons: vipStatus.reasons,

      sources: vipStatus.sources,

      customer: vipStatus.customer,
    });
  } catch (error) {
    console.error(
      "VIP status debug error:",
      error,
    );

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