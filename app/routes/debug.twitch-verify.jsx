import { verifyTwitchSubscriber } from "../services/twitch-verification.server";

export const loader = async () => {
  try {
    const result = await verifyTwitchSubscriber({
      customerId: 1,
      shopId: 1,
    });

    return Response.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Twitch verification test error:",
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