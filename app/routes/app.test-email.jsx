import { sendEmail } from "../services/email.server";

export const loader = async () => {
  try {
    const result = await sendEmail({
      to: "zafiasolutions@gmail.com",
      subject: "VIP Access Email Test 🚀",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
        ">
          <h1>VIP Access is working! 🎉</h1>

          <p>
            Your Shopify VIP Access app is now
            successfully connected to Resend.
          </p>

          <p>
            This is a test email from your
            VIP Access automation system.
          </p>
        </div>
      `,
    });

    return Response.json({
      success: true,
      emailId: result?.id,
    });
  } catch (error) {
    console.error("TEST EMAIL ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
};