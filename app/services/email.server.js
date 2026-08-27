import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY,
);

export async function sendEmail({
  to,
  subject,
  html,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is missing",
    );
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error(
      "EMAIL_FROM is missing",
    );
  }

  if (!to) {
    throw new Error(
      "Email recipient is required",
    );
  }

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (result.error) {
    console.error(
      "RESEND EMAIL ERROR:",
      result.error,
    );

    throw new Error(
      result.error.message ||
        "Failed to send email",
    );
  }

  console.log(
    "EMAIL SENT SUCCESSFULLY:",
    {
      to,
      subject,
      emailId: result.data?.id,
    },
  );

  return result.data;
}