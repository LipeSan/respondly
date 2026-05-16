import crypto from "crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Escopo principal do Business Profile
export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage"; // :contentReference[oaicite:3]{index=3}

export function makeState(payload: object) {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET!;
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(json).digest("hex");
  return Buffer.from(`${sig}.${json}`).toString("base64url");
}

export function parseState(state: string) {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET!;
  const raw = Buffer.from(state, "base64url").toString("utf8");
  const [sig, json] = raw.split(".", 2);
  const expected = crypto.createHmac("sha256", secret).update(json).digest("hex");
  if (sig !== expected) throw new Error("Invalid state");
  return JSON.parse(json);
}

export function buildAuthUrl(params: {
  redirectUri: string;
  clientId: string;
  state: string;
}) {
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GBP_SCOPE);
  u.searchParams.set("access_type", "offline"); // refresh_token :contentReference[oaicite:4]{index=4}
  u.searchParams.set("prompt", "consent"); // garante refresh_token em muitos casos
  u.searchParams.set("include_granted_scopes", "true"); // :contentReference[oaicite:5]{index=5}
  u.searchParams.set("state", params.state);
  return u.toString();
}

export async function exchangeCodeForTokens(args: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    code: args.code,
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description || data?.error || "Token exchange failed");

  // data: access_token, expires_in, refresh_token (sometimes), scope, token_type
  return data as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    token_type: string;
  };
}
