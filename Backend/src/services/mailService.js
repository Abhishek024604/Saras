import nodemailer from "nodemailer";

let testAccount = null;

/**
 * Creates and configures the nodemailer transporter.
 * Uses environment SMTP configuration if available,
 * or automatically provisions an Ethereal test SMTP account in development.
 */
const getTransporter = async () => {
    let host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    // 1. If explicit credentials are provided, use real SMTP
    if (user && pass) {
        if (!host && user.endsWith("@gmail.com")) {
            host = "smtp.gmail.com";
        }

        if (host === "smtp.gmail.com" || user.endsWith("@gmail.com")) {
            console.log(`[SMTP] Using Gmail SMTP transport for ${user}`);
            return {
                transporter: nodemailer.createTransport({
                    service: "gmail",
                    auth: { user, pass },
                }),
                isRealSMTP: true,
            };
        }

        if (host) {
            console.log(`[SMTP] Using custom SMTP server ${host}:${port}`);
            return {
                transporter: nodemailer.createTransport({
                    host,
                    port,
                    secure,
                    auth: { user, pass },
                }),
                isRealSMTP: true,
            };
        }
    }

    // 2. In development without explicit credentials, create an Ethereal test SMTP transporter
    console.warn(
        "\n[SMTP NOTICE] Real SMTP credentials (SMTP_USER & SMTP_PASS) are not set in Backend/.env.\n" +
        "Outgoing emails are being captured by Ethereal test sandbox (virtual inbox), not sent to real inboxes.\n" +
        "To deliver to real email addresses, set SMTP_USER and SMTP_PASS in Backend/.env.\n"
    );

    if (!testAccount) {
        try {
            testAccount = await nodemailer.createTestAccount();
            console.log("Created Ethereal test sandbox account:", testAccount.user);
        } catch (err) {
            console.warn("Could not create Ethereal SMTP account:", err.message);
        }
    }

    if (testAccount) {
        return {
            transporter: nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            }),
            isRealSMTP: false,
        };
    }

    // 3. Fallback mock transporter (logs to console)
    return {
        transporter: {
            sendMail: async (options) => {
                console.log("\n[SMTP LOCAL LOG] Email would be sent to:", options.to);
                console.log("[SMTP LOCAL LOG] Subject:", options.subject);
                console.log("[SMTP LOCAL LOG] Link:", options.text);
                return { messageId: `mock-${Date.now()}` };
            },
        },
        isRealSMTP: false,
    };
};

/**
 * Sends an invitation email via SMTP.
 */
export const sendInvitationEmail = async ({
    to,
    inviterName,
    tenantName,
    invitationLink,
    expiresAt,
}) => {
    try {
        const { transporter, isRealSMTP } = await getTransporter();
        const fromAddress =
            process.env.SMTP_FROM || '"Workly" <no-reply@workly.com>';

        const formattedExpiry = expiresAt
            ? new Date(expiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
              })
            : "5 days";

        const subject = `You've been invited to join ${tenantName} on Workly`;

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f8f8; margin: 0; padding: 30px 15px; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden; }
    .header { background-color: #3f0e40; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; color: #1d1c1d; line-height: 1.6; }
    .greeting { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
    .message { font-size: 14px; color: #4a4a4a; margin-bottom: 24px; }
    .cta-container { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background-color: #007a5a; color: #ffffff !important; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 32px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
    .cta-button:hover { background-color: #148567; }
    .expiry { font-size: 12px; color: #868686; text-align: center; margin-top: 16px; }
    .footer { border-top: 1px solid #eeeeee; padding: 20px; text-align: center; font-size: 12px; color: #868686; background-color: #fafafa; }
    .link-alt { font-size: 11px; word-break: break-all; color: #1264a3; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Workly</h1>
    </div>
    <div class="content">
      <div class="greeting">You're invited!</div>
      <p class="message">
        <strong>${inviterName || "A team member"}</strong> has invited you to join the <strong>${tenantName}</strong> organization workspace on Workly.
      </p>
      <div class="cta-container">
        <a href="${invitationLink}" class="cta-button" target="_blank">Join ${tenantName}</a>
        <div class="expiry">This invitation expires on ${formattedExpiry}.</div>
      </div>
      <p class="message" style="margin-bottom: 6px; font-size: 12px; color: #616061;">
        If the button above does not work, copy and paste this link into your browser:
      </p>
      <div class="link-alt">${invitationLink}</div>
    </div>
    <div class="footer">
      Sent with care by Workly. If you weren't expecting this invitation, you can ignore this email.
    </div>
  </div>
</body>
</html>
`;

        const text = `
You've been invited to join ${tenantName} on Workly!

${inviterName || "A team member"} has invited you to collaborate in ${tenantName}.

Click the link below or paste it in your browser to accept the invitation:
${invitationLink}

This invitation expires on ${formattedExpiry}.
`;

        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            text,
            html,
        });

        let previewUrl = null;
        if (typeof nodemailer.getTestMessageUrl === "function") {
            previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log("\n[SMTP TEST EMAIL PREVIEW]:", previewUrl);
            }
        }

        console.log(`[SMTP SUCCESS] Invitation sent to ${to} (Message ID: ${info.messageId})`);

        return {
            success: true,
            messageId: info.messageId,
            previewUrl,
            isRealSMTP,
        };
    } catch (err) {
        console.error("[SMTP ERROR] Failed to send invitation email:", err);
        return {
            success: false,
            error: err.message,
        };
    }
};
