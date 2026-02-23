import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── براندات سعودية معروفة ──────────────────────────────────────
const SAUDI_BRANDS = [
  "المراعي", "نادك", "الروضة", "الصافي", "القصيم", "الطائف",
  "بيورا", "نجد", "الجوف", "حائل", "الدرعية", "سدير",
  "almarai", "nadec", "alsafi", "bayara",
];

// ─── بناء استعلام محسّن للمنتجات السعودية ──────────────────────
function buildSearchQuery(query: string): string {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // إذا كان الاستعلام يحتوي على براند سعودي معروف
  const hasSaudiBrand = SAUDI_BRANDS.some((b) =>
    lower.includes(b.toLowerCase())
  );

  if (hasSaudiBrand) {
    // البراند موجود → نبحث عن المنتج مباشرة كما هو
    return `${trimmed} منتج`;
  }

  // لا يوجد براند → نضيف "سعودي" لتفضيل المنتجات المحلية
  return `${trimmed} منتج سعودي`;
}

// ─── جلب vqd token من DuckDuckGo ──────────────────────────────
async function getVqd(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ar-SA,ar;q=0.9,en;q=0.8",
        },
      }
    );
    const html = await res.text();
    const match = html.match(/vqd=['"]([^'"]+)['"]/);
    if (match) return match[1];
    const match2 = html.match(/vqd=([^&"'\s]+)/);
    if (match2) return match2[1];
    return null;
  } catch (e) {
    console.error("getVqd error:", e);
    return null;
  }
}

// ─── جلب الصور من DuckDuckGo ───────────────────────────────────
async function searchDuckDuckGoImages(
  query: string,
  count: number,
  region = "xa-ar" // xa-ar = المملكة العربية السعودية بالعربية
): Promise<{ images: string[]; titles: string[] }> {
  try {
    const vqd = await getVqd(query);
    if (!vqd) {
      console.error("Could not get vqd token for:", query);
      return { images: [], titles: [] };
    }

    const params = new URLSearchParams({
      l: region,       // المنطقة: السعودية
      o: "json",
      q: query,
      vqd: vqd,
      f: ",,,,,",
      p: "1",
    });

    const res = await fetch(
      `https://duckduckgo.com/i.js?${params.toString()}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "ar-SA,ar;q=0.9,en;q=0.8",
          "Referer": `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!res.ok) {
      console.error("DuckDuckGo images request failed:", res.status);
      return { images: [], titles: [] };
    }

    const data = await res.json();
    const results = (data.results || []).slice(0, count);

    const images: string[] = [];
    const titles: string[] = [];

    for (const item of results) {
      if (item.image) {
        images.push(item.image);
        titles.push(item.title || "");
      }
    }

    console.log(`DuckDuckGo [${region}] returned ${images.length} images for: "${query}"`);
    return { images, titles };
  } catch (e) {
    console.error("DuckDuckGo search error:", e);
    return { images: [], titles: [] };
  }
}

// ─── الـ Handler الرئيسي ───────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, count = 6 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ images: [], titles: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numResults = Math.min(Math.max(count, 2), 10);
    const searchQuery = buildSearchQuery(query);

    console.log(`Searching: "${searchQuery}" (original: "${query}")`);

    // المحاولة الأولى: بحث بالمنطقة السعودية
    let { images, titles } = await searchDuckDuckGoImages(searchQuery, numResults, "xa-ar");

    // المحاولة الثانية: إذا ما رجعت نتائج، نجرب بدون تحديد المنطقة
    if (images.length === 0) {
      console.log("Retrying without region filter...");
      ({ images, titles } = await searchDuckDuckGoImages(searchQuery, numResults, "wt-wt"));
    }

    // المحاولة الثالثة: نجرب بالاستعلام الأصلي بدون إضافات
    if (images.length === 0) {
      console.log("Retrying with original query:", query);
      ({ images, titles } = await searchDuckDuckGoImages(query, numResults, "wt-wt"));
    }

    return new Response(
      JSON.stringify({ images, titles }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("search-images error:", error);
    return new Response(
      JSON.stringify({ images: [], titles: [], error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
