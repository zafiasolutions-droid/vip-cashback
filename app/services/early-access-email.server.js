import db from "../db.server";
import { sendEmail } from "./email.server";

function getVipCustomers(shopId, threshold) {
  return db.customer.findMany({
    where: {
      shopId,

      OR: [
        {
          manualVip: {
            is: {
              isActive: true,
            },
          },
        },

        {
          spending: {
            is: {
              eligibleAmount: {
                gte: threshold,
              },
            },
          },
        },

        {
          twitchConnection: {
            is: {
              isSubscriber: true,
            },
          },
        },
      ],
    },

    include: {
      manualVip: true,
      spending: true,
      twitchConnection: true,
    },
  });
}

export async function sendEarlyAccessEmails({
  shopId,
  earlyAccessEvent,
}) {
  const spendingRule =
    await db.spendingRule.findUnique({
      where: {
        shopId,
      },
    });

  const threshold =
    spendingRule?.enabled
      ? spendingRule.threshold
      : Number.MAX_SAFE_INTEGER;

  const customers =
    await getVipCustomers(
      shopId,
      threshold,
    );

  console.log(
    "EARLY ACCESS EMAIL CUSTOMERS:",
    customers.length,
  );

  for (const customer of customers) {
    if (!customer.email) {
      console.log(
        "SKIPPING CUSTOMER WITHOUT EMAIL:",
        customer.id,
      );

      continue;
    }

    const existingLog =
      await db.emailLog.findUnique({
        where: {
          customerId_earlyAccessEventId_automationType: {
            customerId: customer.id,
            earlyAccessEventId:
              earlyAccessEvent.id,
            automationType: "EARLY_ACCESS",
          },
        },
      });

    if (existingLog) {
      console.log(
        "EMAIL ALREADY PROCESSED:",
        {
          customerId: customer.id,
          eventId: earlyAccessEvent.id,
        },
      );

      continue;
    }

    const emailLog =
      await db.emailLog.create({
        data: {
          shopId,
          customerId: customer.id,
          earlyAccessEventId:
            earlyAccessEvent.id,
          automationType: "EARLY_ACCESS",
          status: "PENDING",
        },
      });

    try {
      await sendEmail({
        to: customer.email,

        subject: `VIP Early Access: ${earlyAccessEvent.productTitleSnapshot} is live 🚀`,

        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 30px;
            color: #111111;
          ">
            <div style="
              display: inline-block;
              background: #000000;
              color: #ffffff;
              padding: 8px 14px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: bold;
              letter-spacing: 1px;
              margin-bottom: 20px;
            ">
              VIP EXCLUSIVE
            </div>

            <h1 style="
              font-size: 32px;
              margin: 0 0 16px;
            ">
              Early Access is Live 🚀
            </h1>

            <p style="
              font-size: 16px;
              line-height: 1.7;
              color: #555555;
            ">
              Hi${customer.firstName ? ` ${customer.firstName}` : ""},
            </p>

            <p style="
              font-size: 16px;
              line-height: 1.7;
              color: #555555;
            ">
              As a VIP member, you now have exclusive early
              access to a product before it becomes publicly
              available.
            </p>

            <div style="
              margin: 28px 0;
              padding: 24px;
              border: 1px solid #eeeeee;
              border-radius: 12px;
              background: #fafafa;
            ">
              <div style="
                font-size: 12px;
                font-weight: bold;
                letter-spacing: 1px;
                color: #777777;
                margin-bottom: 8px;
              ">
                NOW AVAILABLE FOR VIP MEMBERS
              </div>

              <div style="
                font-size: 22px;
                font-weight: bold;
                color: #111111;
              ">
                ${earlyAccessEvent.productTitleSnapshot}
              </div>
            </div>

            <p style="
              font-size: 16px;
              line-height: 1.7;
              color: #555555;
            ">
              Don't miss your early access window. Visit the
              store now and get access before everyone else.
            </p>

            <p style="
              margin-top: 30px;
              font-size: 14px;
              color: #888888;
            ">
              You're receiving this email because you qualify
              for VIP access.
            </p>
          </div>
        `,
      });

      await db.emailLog.update({
        where: {
          id: emailLog.id,
        },

        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });

      console.log(
        "EARLY ACCESS EMAIL SENT:",
        {
          customerId: customer.id,
          email: customer.email,
          eventId: earlyAccessEvent.id,
        },
      );
    } catch (error) {
      console.error(
        "EARLY ACCESS EMAIL FAILED:",
        {
          customerId: customer.id,
          error,
        },
      );

      await db.emailLog.update({
        where: {
          id: emailLog.id,
        },

        data: {
          status: "FAILED",
        },
      });
    }
  }
}