import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── تحسين استعلام البحث لجلب صور المنتجات بدقة أعلى ───────────
function buildSearchQuery(query: string): string {
  const trimmed = query.trim();

  // إذا كان الاستعلام يحتوي على براند معروف، نضيف كلمة "product" لتحسين النتائج
  const brandKeywords = [
    "المراعي", "نادك", "الروضة", "الطائف", "بيورا", "نستله", "دانون",
    "لولو", "كارفور", "بنده", "مزرعة", "الصافي", "القصيم",
    "almarai", "nadec", "nestle", "danone", "panda", "lulu",
  ];

  const hasBrand = brandKeywords.some((b) =>
    trimmed.toLowerCase().includes(b.toLowerCase())
  );

  // بناء استعلام محسّن: نضيف "منتج" أو "product" لتحسين جودة الصور
  if (hasBrand) {
    return `${trimmed} منتج بقالة`;
  }

  return `${trimmed} منتج بقالة سعودي`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, count = 6 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ images: [], titles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const cx = Deno.env.get("GOOGLE_SEARCH_CX");

    if (!apiKey || !cx) {
      console.error("Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX");
      return new Response(JSON.stringify({ images: [], titles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchQuery = buildSearchQuery(query);
    const numResults = Math.min(Math.max(count, 2), 10); // بين 2 و 10

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("searchType", "image");
    url.searchParams.set("num", String(numResults));
    url.searchParams.set("imgSize", "medium");
    url.searchParams.set("imgType", "photo");
    url.searchParams.set("safe", "active");
    // تفضيل الصور المربعة (مناسبة لعرض المنتجات)
    url.searchParams.set("imgColorType", "color");

    console.log(`Searching Google Images for: "${searchQuery}" (${numResults} results)`);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      console.error("Google API error:", JSON.stringify(data.error));
      return new Response(
        JSON.stringify({
          images: [],
          titles: [],
          error: data.error.message,
        }),
        {
          status: 200, // نرجع 200 حتى لا يكسر الـ frontend
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const items = data.items || [];

    // نرجع الصور مع عناوينها لعرض اسم البراند تحت كل صورة
    const images: string[] = [];
    const titles: string[] = [];
    const contextLinks: string[] = [];

    for (const item of items) {
      if (item.link) {
        images.push(item.link);
        titles.push(item.title || "");
        contextLinks.push(item.image?.contextLink || "");
      }
    }

    console.log(`Returned ${images.length} images for query: "${searchQuery}"`);

    return new Response(
      JSON.stringify({ images, titles, contextLinks }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Search images error:", error);
    return new Response(
      JSON.stringify({ images: [], titles: [], error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
