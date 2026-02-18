import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `أنت خبير في التعرف على المنتجات الغذائية والمنزلية. انظر إلى هذه الصورة وحدد المنتج.

أجب فقط باستخدام الأداة المتاحة لك.`,
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_product",
              description: "يحدد المنتج من الصورة ويعيد بياناته",
              parameters: {
                type: "object",
                properties: {
                  name_ar: {
                    type: "string",
                    description: "اسم المنتج بالعربية (مثال: طماطم، حليب، أرز)",
                  },
                  name_en: {
                    type: "string",
                    description: "اسم المنتج بالإنجليزية (مثال: Tomato, Milk, Rice)",
                  },
                  emoji: {
                    type: "string",
                    description: "رمز تعبيري مناسب للمنتج (مثال: 🍅, 🥛, 🍚)",
                  },
                  category: {
                    type: "string",
                    description: "الفئة التقريبية: خضروات، فواكه، لحوم، ألبان، مخبوزات، مشروبات، منظفات، أخرى",
                  },
                },
                required: ["name_ar", "emoji"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "identify_product" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول مرة أخرى لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "مفتاح OpenAI غير صالح، يرجى التحقق من الإعدادات" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const product = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "لم يتمكن الذكاء الاصطناعي من التعرف على المنتج" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("recognize-product error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
