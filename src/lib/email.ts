import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM || "Athena <onboarding@resend.dev>";

let client: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface ArticleReadyParams {
  to: string;
  name: string | null;
  postId: string;
  title: string;
  wordCount: number;
}

export async function sendArticleReadyEmail(params: ArticleReadyParams) {
  const resend = getResend();
  if (!resend) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${appUrl}/dashboard/posts/${params.postId}`;
  const greeting = params.name
    ? `Bonjour ${escapeHtml(params.name)}`
    : "Bonjour";
  const safeTitle = escapeHtml(params.title);

  await resend.emails.send({
    from: EMAIL_FROM,
    to: params.to,
    subject: `Votre article est pret : ${params.title}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#1f2937;padding:24px;">
        <h1 style="font-size:20px;margin:0 0 16px;">${greeting},</h1>
        <p style="font-size:15px;line-height:1.6;margin:0 0 8px;">Votre article est pret a etre lu :</p>
        <h2 style="font-size:18px;margin:24px 0 4px;">${safeTitle}</h2>
        <p style="font-size:13px;color:#6b7280;margin:0;">${params.wordCount} mots</p>
        <p style="margin:24px 0;">
          <a href="${url}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;display:inline-block;">Ouvrir mon article</a>
        </p>
        <p style="font-size:13px;color:#6b7280;margin-top:32px;">L'equipe Athena</p>
      </div>
    `,
  });
}
