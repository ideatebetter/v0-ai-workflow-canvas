const RESEND_API_URL = "https://api.resend.com/emails";

interface SendInviteEmailParams {
  to: string;
  workspaceName: string;
  inviterEmail: string;
  role: string;
  inviteLink: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export async function sendInviteEmail({
  to,
  workspaceName,
  inviterEmail,
  role,
  inviteLink,
}: SendInviteEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping invite email");
    return { ok: false, error: "Email service not configured" };
  }

  const roleLabel = ROLE_LABEL[role] ?? role;
  // Use EMAIL_FROM env var for a verified custom domain, otherwise fall back to
  // Resend's shared domain which works without domain verification
  const fromDomain = process.env.EMAIL_FROM ?? "Atlas <onboarding@resend.dev>";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111111;border-radius:16px;border:1px solid #222222;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #1e1e1e;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Atlas</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#ffffff;">
            You're invited to join <span style="color:#F0FE00;">${workspaceName}</span>
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#888888;line-height:1.6;">
            ${inviterEmail} has invited you to collaborate on <strong style="color:#cccccc;">${workspaceName}</strong> as a <strong style="color:#cccccc;">${roleLabel}</strong>.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td>
              <a href="${inviteLink}" style="display:inline-block;padding:12px 28px;background:#F0FE00;color:#111111;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.1px;">
                Accept Invitation
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:12px;color:#555555;">Or copy this link into your browser:</p>
          <p style="margin:0;font-size:12px;color:#888888;word-break:break-all;background:#1a1a1a;padding:10px 12px;border-radius:6px;border:1px solid #2a2a2a;">
            ${inviteLink}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #1e1e1e;">
          <p style="margin:0;font-size:12px;color:#444444;">
            This invite expires in 7 days. If you weren't expecting this, you can safely ignore it.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromDomain,
        to: [to],
        subject: `You've been invited to join ${workspaceName} on Atlas`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Resend error:", res.status, body);
      return { ok: false, error: `Email delivery failed (${res.status})` };
    }

    return { ok: true };
  } catch (err) {
    console.error("sendInviteEmail exception:", err);
    return { ok: false, error: "Failed to send email" };
  }
}
