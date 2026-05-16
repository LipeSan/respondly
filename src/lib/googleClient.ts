import { prisma } from "@/lib/db";

async function refreshAccessToken(args: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}) {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    refresh_token: args.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const errorDescription =
      typeof (data as { error_description?: unknown } | null)?.error_description === "string"
        ? (data as { error_description: string }).error_description
        : undefined;

    const errorCode =
      typeof (data as { error?: unknown } | null)?.error === "string"
        ? (data as { error: string }).error
        : undefined;

    const message = errorDescription || errorCode || raw || `Refresh failed (${res.status})`;
    throw new Error(message);
  }

  return data as { access_token: string; expires_in: number; scope?: string; token_type?: string };
}

export async function getGoogleAccessToken(businessId: string) {
  const conn = await prisma.googleConnection.findUnique({ where: { businessId } });
  if (!conn) throw new Error("Google not connected");

  const now = Date.now();
  const expiresAt = conn.expiresAt.getTime();

  // se expira em menos de 60s, renova
  if (expiresAt - now < 60_000) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    if (!clientId || !clientSecret) throw new Error("Google env not set");

    if (!conn.refreshToken) throw new Error("Missing refresh token");

    try {
      const refreshed = await refreshAccessToken({
        refreshToken: conn.refreshToken,
        clientId,
        clientSecret,
      });

      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      await prisma.googleConnection.update({
        where: { businessId },
        data: { accessToken: refreshed.access_token, expiresAt: newExpiresAt },
      });

      return refreshed.access_token;
    } catch (error) {
      const msg = String((error as Error)?.message || "");
      const normalized = msg.toLowerCase();

      const isRevoked =
        normalized.includes("token has been expired or revoked") ||
        normalized.includes("invalid_grant");

      if (isRevoked) {
        await prisma.googleConnection.delete({ where: { businessId } });
        throw new Error("Google connection expired or revoked. Please reconnect in the dashboard.");
      }

      throw error;
    }
  }

  return conn.accessToken;
}

export async function googleGet<T>(accessToken: string, url: string, retries = 0): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || "Google API error";

    // Retry on rate limit
    const isRateLimit = res.status === 429 ||
      msg.toLowerCase().includes("quota") ||
      msg.toLowerCase().includes("rate limit");

    if (isRateLimit && retries < 3) {
      const delay = 1000 * Math.pow(2, retries); // 1s, 2s, 4s
      console.log(`Google API rate limit. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return googleGet<T>(accessToken, url, retries + 1);
    }

    throw new Error(msg);
  }
  return data as T;
}

export async function googleGetForBusiness<T>(
  businessId: string,
  url: string,
  retries = 0,
  authRetries = 0
): Promise<T> {
  const accessToken = await getGoogleAccessToken(businessId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || "Google API error";
    const normalized = String(msg).toLowerCase();

    const isRateLimit =
      res.status === 429 || normalized.includes("quota") || normalized.includes("rate limit");

    if (isRateLimit && retries < 3) {
      const delay = 1000 * Math.pow(2, retries);
      console.log(`Google API rate limit. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return googleGetForBusiness<T>(businessId, url, retries + 1, authRetries);
    }

    const isAuthError =
      res.status === 401 ||
      res.status === 403 ||
      normalized.includes("token has been expired or revoked") ||
      normalized.includes("invalid authentication credentials") ||
      normalized.includes("request had invalid authentication credentials");

    if (isAuthError && authRetries < 1) {
      try {
        await prisma.googleConnection.update({
          where: { businessId },
          data: { expiresAt: new Date(0) },
        });
      } catch {
      }

      return googleGetForBusiness<T>(businessId, url, retries, authRetries + 1);
    }

    throw new Error(msg);
  }

  return data as T;
}

function extractGoogleApiErrorMessage(data: unknown, raw: string) {
  if (data && typeof data === "object") {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
  }
  return raw || "Google API error";
}

export async function googlePutForBusiness<T>(
  businessId: string,
  url: string,
  body: unknown,
  retries = 0,
  authRetries = 0
): Promise<T> {
  const accessToken = await getGoogleAccessToken(businessId);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = extractGoogleApiErrorMessage(data, raw);
    const normalized = String(msg).toLowerCase();

    const isRateLimit =
      res.status === 429 || normalized.includes("quota") || normalized.includes("rate limit");

    if (isRateLimit && retries < 3) {
      const delay = 1000 * Math.pow(2, retries);
      console.log(`Google API rate limit. Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return googlePutForBusiness<T>(businessId, url, body, retries + 1, authRetries);
    }

    const isAuthError =
      res.status === 401 ||
      res.status === 403 ||
      normalized.includes("token has been expired or revoked") ||
      normalized.includes("invalid authentication credentials") ||
      normalized.includes("request had invalid authentication credentials");

    if (isAuthError && authRetries < 1) {
      try {
        await prisma.googleConnection.update({
          where: { businessId },
          data: { expiresAt: new Date(0) },
        });
      } catch {
      }

      return googlePutForBusiness<T>(businessId, url, body, retries, authRetries + 1);
    }

    throw new Error(String(msg));
  }

  return data as T;
}
