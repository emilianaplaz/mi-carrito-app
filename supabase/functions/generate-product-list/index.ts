import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch sample products and subcategories from the database
    const { data: products, error: productsError } = await supabase
      .from("product_prices")
      .select("producto, subcategoria")
      .limit(500);

    if (productsError) throw productsError;

    // Create a unique list of product names and subcategories
    const uniqueItems = new Set<string>();
    products?.forEach((p: any) => {
      if (p.producto) uniqueItems.add(p.producto);
      if (p.subcategoria) uniqueItems.add(p.subcategoria);
    });

    const sampleList = Array.from(uniqueItems).slice(0, 200).join(", ");

    // Call Lovable AI to generate generic product names
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates generic grocery product names in Spanish for a shopping list app. Generate clear, simple generic names that everyday shoppers would use."
          },
          {
            role: "user",
            content: `Based on this sample of products from a grocery database: ${sampleList}

Create a comprehensive list of generic product names in Spanish that cover common grocery categories. Use simple, everyday language that shoppers would naturally use (e.g., "aceite de oliva", "tomate", "leche", "arroz").

Return ONLY a JSON array of strings, with about 100-150 generic product names, sorted alphabetically. No markdown, no explanation.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_product_list",
              description: "Generate a list of generic grocery product names",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of generic product names in Spanish"
                  }
                },
                required: ["products"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_product_list" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const genericProducts = toolCall?.function?.arguments 
      ? JSON.parse(toolCall.function.arguments).products 
      : [];

    return new Response(
      JSON.stringify({ products: genericProducts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
