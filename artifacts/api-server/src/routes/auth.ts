import { Router, type IRouter, type Request, type Response } from "express";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";

const router: IRouter = Router();

function getFirebaseAdminAuth() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Email verification is not configured.");
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: "gopacknow-83d54",
        clientEmail,
        privateKey,
      }),
    });
  }

  return getAuth();
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Email verification is not configured.");
  }
  return new Resend(apiKey);
}

function buildEmailHtml(verifyUrl: string, displayName: string): string {
  const firstName = displayName?.split(" ")[0] ?? "there";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your GoPackNow email</title>
</head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#E85D3A;border-radius:20px;width:64px;height:64px;text-align:center;vertical-align:middle;">
                    <span style="font-size:32px;line-height:64px;">🧳</span>
                  </td>
                </tr>
              </table>
              <div style="margin-top:16px;font-size:28px;font-weight:700;color:#E85D3A;letter-spacing:-0.5px;">GoPackNow</div>
              <div style="font-size:14px;color:#8B7E75;margin-top:4px;">Plan trips together</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:20px;padding:48px 48px 40px;box-shadow:0 2px 16px rgba(0,0,0,0.06);">

              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1A1412;letter-spacing:-0.3px;">
                Confirm your email, ${firstName} 👋
              </h1>
              <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#5C5047;">
                Welcome to GoPackNow! You're one step away from planning epic trips with your crew. Click the button below to verify your email address.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${verifyUrl}"
                       style="display:inline-block;background:#E85D3A;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:14px;letter-spacing:0.2px;">
                      Verify my email →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-top:1px solid #F0EAE4;"></td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#8B7E75;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;color:#B0A49A;word-break:break-all;line-height:1.5;">
                ${verifyUrl}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 0;">
              <p style="margin:0 0 4px;font-size:13px;color:#B0A49A;">
                This link expires in 24 hours. If you didn't create a GoPackNow account, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:13px;color:#B0A49A;">
                — The GoPackNow Team · <a href="https://gopack.now" style="color:#E85D3A;text-decoration:none;">gopack.now</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

router.post("/auth/send-verification", async (req: Request, res: Response) => {
  const { uid, email, displayName } = req.body as {
    uid?: string;
    email?: string;
    displayName?: string;
  };

  if (!uid || !email) {
    res.status(400).json({ error: "uid and email are required" });
    return;
  }

  try {
    const verifyUrl = await getFirebaseAdminAuth().generateEmailVerificationLink(email);

    const { error } = await getResendClient().emails.send({
      from: "GoPackNow <onboarding@resend.dev>",
      to: email,
      subject: "Confirm your GoPackNow email address",
      html: buildEmailHtml(verifyUrl, displayName ?? ""),
    });

    if (error) {
      req.log.error({ error }, "Resend error");
      res.status(500).json({ error: "Failed to send email" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    req.log.error({ err }, "send-verification error");
    res.status(500).json({ error: err?.message ?? "Unknown error" });
  }
});

export default router;
