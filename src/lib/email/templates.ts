export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type EmailLayoutArgs = {
  subject: string;
  title: string;
  preheader: string;
  origin?: string;
  bodyHtml: string;
  cta?: {
    label: string;
    url: string;
  };
  footerText?: string;
};

function renderEmailLayout(args: EmailLayoutArgs) {
  const safeSubject = escapeHtml(args.subject);
  const safeTitle = escapeHtml(args.title);
  const safePreheader = escapeHtml(args.preheader);

  const safeFooterText = args.footerText ? escapeHtml(args.footerText) : null;
  const origin = normalizeOrigin(args.origin);
  const brandUrl = origin ?? "https://respondly.com.au";
  const logoUrl = origin ? `${origin}/logo-header.png` : null;

  const cta =
    args.cta && args.cta.url
      ? {
          label: escapeHtml(args.cta.label),
          url: args.cta.url,
        }
      : null;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #050816;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
      ${safePreheader}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background: #050816;">
      <tr>
        <td align="center" style="padding: 32px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width: 100%; max-width: 600px; border-collapse: separate; border-radius: 16px; overflow: hidden; border: 1px solid #111827; background: #0b1220;">
            <tr>
              <td style="height: 6px; background: #2563eb;"></td>
            </tr>
            <tr>
              <td style="padding: 20px 24px; border-bottom: 1px solid #111827;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      <a href="${brandUrl}" style="text-decoration: none; display: inline-block;">
                        ${
                          logoUrl
                            ? `<img src="${logoUrl}" alt="Respondly" width="140" height="28" style="display:block; height:28px; width:auto; max-width:140px; border:0; outline:none; text-decoration:none;" />`
                            : `<span style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-weight: 800; font-size: 18px; letter-spacing: -0.02em; color: #ffffff;">Respondly</span>`
                        }
                      </a>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 12px; color: #9ca3af;">
                        ${safeTitle}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px 24px 8px;">
                <h1 style="margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 24px; line-height: 1.25; letter-spacing: -0.02em; color: #ffffff;">
                  ${safeTitle}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 20px;">
                <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 14px; line-height: 1.6; color: #e5e7eb;">
                  ${args.bodyHtml}
                </div>
                ${
                  cta
                    ? `
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 18px; border-collapse: collapse;">
                  <tr>
                    <td align="left">
                      <a href="${cta.url}" style="display:inline-block; background:#2563eb; color:#ffffff; padding:12px 16px; border-radius:10px; text-decoration:none; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-weight: 800; font-size: 14px;">
                        ${cta.label}
                      </a>
                    </td>
                  </tr>
                </table>`
                    : ""
                }
                ${
                  cta
                    ? `
                <p style="margin: 14px 0 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 12px; color: #9ca3af;">
                  Or copy and paste this link:<br />
                  <a href="${cta.url}" style="color: #93c5fd; text-decoration: none;">${cta.url}</a>
                </p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 24px 24px; border-top: 1px solid #111827;">
                <p style="margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size: 12px; line-height: 1.6; color: #9ca3af;">
                  ${safeFooterText ?? "© Respondly. All rights reserved."}
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

export function buildWelcomeEmail(args: { name?: string | null; loginUrl: string }): EmailContent {
  const displayName = args.name?.trim() ? args.name.trim() : "there";
  const safeName = escapeHtml(displayName);
  const origin = safeOriginFromUrl(args.loginUrl);

  const subject = "Welcome to Respondly";
  const text = `Hi ${displayName},\n\nWelcome to Respondly! Your account is ready.\n\nLog in here: ${args.loginUrl}\n\n— Respondly`;
  const bodyHtml = `
    <p style="margin: 16px 0 0;">Hi ${safeName},</p>
    <p style="margin: 12px 0 0;">Welcome to Respondly! Your account is ready.</p>
    <p style="margin: 12px 0 0; color: #9ca3af; font-size: 13px;">
      Tip: after logging in, complete onboarding to connect your Google Business Profile and start syncing reviews.
    </p>
  `;
  const html = renderEmailLayout({
    subject,
    title: "Welcome to Respondly",
    preheader: "Your Respondly account is ready.",
    origin,
    bodyHtml,
    cta: { label: "Log in", url: args.loginUrl },
    footerText: "If you didn't create this account, you can ignore this email.",
  });

  return { subject, html, text };
}

export function buildResetPasswordEmail(args: { resetUrl: string }): EmailContent {
  const origin = safeOriginFromUrl(args.resetUrl);
  const subject = "Reset your Respondly password";
  const text = `Use the link below to reset your password:\n\n${args.resetUrl}\n\nThis link expires in 1 hour.`;
  const bodyHtml = `
    <p style="margin: 16px 0 0;">Click the button below to reset your Respondly password.</p>
    <p style="margin: 12px 0 0; color: #9ca3af; font-size: 13px;">This link expires in 1 hour.</p>
  `;
  const html = renderEmailLayout({
    subject,
    title: "Reset your password",
    preheader: "Reset your Respondly password. This link expires in 1 hour.",
    origin,
    bodyHtml,
    cta: { label: "Reset password", url: args.resetUrl },
    footerText: "If you didn't request this, you can ignore this email.",
  });

  return { subject, html, text };
}

export function buildProductInfoEmail(args: { name?: string | null; registerUrl: string }): EmailContent {
  const displayName = args.name?.trim() ? args.name.trim() : "Hi there";
  const safeName = escapeHtml(displayName);
  const origin = safeOriginFromUrl(args.registerUrl);
  const registerUrl = args.registerUrl;

  const subject = "Meet Respondly — automate replies and win back time";
  const preheader = "Automate Google review replies with AI and keep your Google Business Profile up to date.";
  const text =
    `Hi ${displayName},\n\n` +
    `Respondly helps local businesses reply to Google reviews faster and more consistently.\n\n` +
    `Key benefits:\n` +
    `- Automated replies for Google reviews\n` +
    `- Templates and rules by rating (1–5 stars)\n` +
    `- AI-assisted replies for a more natural tone (Pro)\n` +
    `- Less manual work, more time for your business\n\n` +
    `Create your account here: ${registerUrl}\n\n` +
    `— Respondly`;

  const bodyHtml = `
    <p style="margin: 16px 0 0;">Hi ${safeName},</p>
    <p style="margin: 12px 0 0;">
      <strong>Respondly</strong> automates Google review replies so you can save time and keep your online presence consistent.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; border-collapse: separate; border-spacing: 0; border: 1px solid #111827; background: #0b1220; border-radius: 14px;">
      <tr>
        <td style="padding: 14px 14px 12px;">
          <div style="font-weight: 800; color: #ffffff; font-size: 14px; margin: 0 0 10px;">What you get</div>
          <ul style="margin: 0; padding-left: 18px; color: #e5e7eb;">
            <li style="margin: 6px 0;">Automated replies for Google reviews</li>
            <li style="margin: 6px 0;">Rules and templates by rating (1–5 stars)</li>
            <li style="margin: 6px 0;">AI-assisted replies for a more natural tone (Pro plan)</li>
            <li style="margin: 6px 0;">A simple dashboard to manage it all</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px;">
      It only takes a few minutes to create an account and connect your Google Business Profile.
    </p>
  `;

  const html = renderEmailLayout({
    subject,
    title: "Respondly: automate replies",
    preheader,
    origin,
    bodyHtml,
    cta: { label: "Create account", url: registerUrl },
    footerText: "If you no longer want to receive emails like this, you can reply to this email.",
  });

  return { subject, html, text };
}

export function buildAdminMessageEmail(args: {
  subject: string;
  message: string;
  origin?: string;
  cta?: { label: string; url: string } | null;
}): EmailContent {
  const subject = args.subject.trim();
  const message = args.message.trim();
  const paragraphs = message.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  const bodyHtml = paragraphs
    .map(
      (block, index) =>
        `<p style="margin: ${index === 0 ? "16px" : "12px"} 0 0;">${escapeHtml(block).replaceAll("\n", "<br />")}</p>`
    )
    .join("");
  const text = args.cta ? `${message}\n\n${args.cta.label}: ${args.cta.url}` : message;

  const html = renderEmailLayout({
    subject,
    title: subject,
    preheader: paragraphs[1] ?? paragraphs[0] ?? subject,
    origin: args.origin,
    bodyHtml,
    cta: args.cta ?? undefined,
    footerText: "You're receiving this because you have a Respondly account. Just reply to this email if you need help.",
  });

  return { subject, html, text };
}

type InsightEmailItem = { title: string; summary: string; mentions: number; suggestion: string };

function renderInsightItems(heading: string, color: string, items: InsightEmailItem[]) {
  if (!items.length) return "";
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0 0;">
            <div style="font-weight: 700; color: #ffffff;">${escapeHtml(item.title)}
              <span style="font-weight: 400; color: #9ca3af; font-size: 12px;">· ${item.mentions} ${item.mentions === 1 ? "review" : "reviews"}</span>
            </div>
            <div style="margin-top: 2px; color: #d1d5db;">${escapeHtml(item.summary)}</div>
            <div style="margin-top: 4px; color: #9ca3af; font-size: 13px;">Tip: ${escapeHtml(item.suggestion)}</div>
          </td>
        </tr>`
    )
    .join("");
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; border-collapse: separate; border-spacing: 0; border: 1px solid #111827; border-left: 3px solid ${color}; border-radius: 12px;">
      <tr>
        <td style="padding: 12px 14px 14px;">
          <div style="font-weight: 800; color: #ffffff; font-size: 14px;">${heading}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">${rows}</table>
        </td>
      </tr>
    </table>`;
}

function insightItemsText(heading: string, items: InsightEmailItem[]) {
  if (!items.length) return "";
  const lines = items.map(
    (item) =>
      `- ${item.title} (${item.mentions} ${item.mentions === 1 ? "review" : "reviews"}): ${item.summary}\n  Tip: ${item.suggestion}`
  );
  return `\n\n${heading}\n${lines.join("\n")}`;
}

export function buildInsightReportEmail(args: {
  name?: string | null;
  businessName: string;
  // e.g. "October 2026" for a monthly report, null for the first one.
  monthLabel: string | null;
  periodLabel: string;
  avgRating: number | null;
  previousAvgRating: number | null;
  reviewCount: number;
  commentCount: number;
  strengths: InsightEmailItem[];
  improvements: InsightEmailItem[];
  reportUrl: string;
}): EmailContent {
  const displayName = args.name?.trim() ? args.name.trim() : "there";
  const origin = safeOriginFromUrl(args.reportUrl);
  const subject = args.monthLabel
    ? `Your ${args.monthLabel} review insights for ${args.businessName}`
    : `Your first review insights for ${args.businessName}`;
  const title = args.monthLabel ? `${args.monthLabel} review insights` : "Your first review insights";

  const rating = args.avgRating !== null ? `${args.avgRating.toFixed(1)}★` : "—";
  const change =
    args.avgRating !== null && args.previousAvgRating !== null
      ? Number((args.avgRating - args.previousAvgRating).toFixed(1))
      : null;
  const changeText =
    change === null ? "" : change === 0 ? "no change from last report" : `${change > 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)} from last report`;
  const changeColor = change === null || change === 0 ? "#9ca3af" : change > 0 ? "#34d399" : "#fb7185";
  const reviewsText = `${args.reviewCount} ${args.reviewCount === 1 ? "review" : "reviews"}, ${args.commentCount} with text`;
  const noIssues = args.improvements.length === 0;

  const bodyHtml = `
    <p style="margin: 16px 0 0;">Hi ${escapeHtml(displayName)},</p>
    <p style="margin: 12px 0 0;">Here's what your customers said about <strong>${escapeHtml(args.businessName)}</strong> from ${escapeHtml(args.periodLabel)}.</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; border-collapse: separate; border-spacing: 0; border: 1px solid #111827; border-radius: 12px;">
      <tr>
        <td style="padding: 14px;">
          <div style="font-size: 28px; font-weight: 800; color: #ffffff;">${rating}
            ${changeText ? `<span style="font-size: 13px; font-weight: 600; color: ${changeColor};">${changeText}</span>` : ""}
          </div>
          <div style="margin-top: 2px; color: #9ca3af; font-size: 13px;">Average rating · ${reviewsText}</div>
        </td>
      </tr>
    </table>

    ${renderInsightItems("What customers love", "#10b981", args.strengths)}
    ${renderInsightItems("What to improve", "#f59e0b", args.improvements)}
    ${noIssues ? `<p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px;">No complaints to work on this time. Nice work.</p>` : ""}
  `;

  const text =
    `Hi ${displayName},\n\n` +
    `Here's what your customers said about ${args.businessName} from ${args.periodLabel}.\n\n` +
    `Average rating: ${rating}${changeText ? ` (${changeText})` : ""} · ${reviewsText}` +
    insightItemsText("What customers love", args.strengths) +
    insightItemsText("What to improve", args.improvements) +
    (noIssues ? "\n\nNo complaints to work on this time. Nice work." : "") +
    `\n\nSee the full report: ${args.reportUrl}\n\n— Respondly`;

  const html = renderEmailLayout({
    subject,
    title,
    preheader: `${rating} average from ${reviewsText}.`,
    origin,
    bodyHtml,
    cta: { label: "See the full report", url: args.reportUrl },
    footerText: "You're receiving this because you have a Respondly account. Just reply to this email if you need help.",
  });

  return { subject, html, text };
}

function safeOriginFromUrl(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function normalizeOrigin(origin?: string) {
  if (!origin) return undefined;
  if (origin.startsWith("http://")) {
    const host = origin.slice("http://".length);
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return origin;
    return `https://${host}`;
  }
  return origin;
}
