import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ images: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const cx = Deno.env.get("GOOGLE_SEARCH_CX");

    if (!apiKey || !cx) {
      console.error("Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX");
      return new Response(JSON.stringify({ images: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=4&imgSize=medium&safe=active`;
    console.log("Fetching Google Images for:", query);
    const res = await fetch(url);
    const data = await res.json();
    console.log("Google API response status:", res.status, "items:", data.items?.length || 0);
    if (data.error) {
      console.error("Google API error:", JSON.stringify(data.error));
    }
    const images = (data.items || []).map((item: any) => item.link).filter(Boolean);

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search images error:", error);
    return new Response(JSON.stringify({ images: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
