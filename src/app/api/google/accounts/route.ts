import { NextResponse } from "next/server";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { googleGetForBusiness } from "@/lib/googleClient";
import { getCache, setCache } from "@/lib/simpleCache";

type GoogleAccount = { name: string; accountName?: string; type?: string };

type AccountsList = {
  accounts?: GoogleAccount[];
};

export async function GET() {
  try {
    const { business } = await getCurrentUserAndBusiness();
    if (!business) return NextResponse.json({ error: "No business" }, { status: 400 });

    // ✅ cache 10 minutes (aggressive to avoid hitting quota)
    const cacheKey = `google:accounts:${business.id}`;
    const cached = getCache<GoogleAccount[]>(cacheKey);
    if (cached) return NextResponse.json({ accounts: cached, cached: true });

    // Check for cached error (Circuit Breaker)
    const errorCacheKey = `google:accounts:error:${business.id}`;
    const cachedError = getCache<string>(errorCacheKey);
    if (cachedError) {
      console.log("Circuit breaker active, returning cached error");
      return NextResponse.json({ error: cachedError }, { status: 429 });
    }

    const data = await googleGetForBusiness<AccountsList>(
      business.id,
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts"
    );

    const accounts = data.accounts ?? [];
    setCache(cacheKey, accounts, 10 * 60 * 1000);

    return NextResponse.json({ accounts, cached: false });
  } catch (error) {
    console.error("Error fetching Google accounts:", error);
    
    // Se der erro de quota, cacheia o erro por 2 minutos para evitar novas tentativas
    const message = String((error as Error)?.message || "");
    const lower = message.toLowerCase();
    const isQuotaError = lower.includes("quota");
    if (isQuotaError) {
       const { business } = await getCurrentUserAndBusiness();
       if (business) {
         setCache(`google:accounts:error:${business.id}`, "Google API Quota exceeded. Please try again in a few minutes.", 2 * 60 * 1000);
       }
       return NextResponse.json({ error: "Google API Quota exceeded. Please try again later." }, { status: 429 });
    }

    if (lower.includes("reconnect") || lower.includes("expired or revoked")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ error: message || "Failed to fetch Google accounts" }, { status: 500 });
  }
}
