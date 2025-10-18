import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listName, items, availablePrices } = await req.json();
    console.log('Received request:', { listName, itemCount: items.length, priceCount: availablePrices.length });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Group prices by supermarket and product
    const pricesBySupermarket: Record<string, any[]> = {};
    availablePrices.forEach((price: any) => {
      const supermarketName = price.supermarkets?.name || "Desconocido";
      if (!pricesBySupermarket[supermarketName]) {
        pricesBySupermarket[supermarketName] = [];
      }
      pricesBySupermarket[supermarketName].push({
        product: price.product_name,
        brand: price.brands?.name,
        price: parseFloat(price.price),
        unit: price.unit,
      });
    });

    // Build the prompt
    const itemsList = items.map((item: any) => `- ${item.name}${item.brand ? ` (marca: ${item.brand})` : ''}`).join('\n');
    
    let pricesInfo = "Precios disponibles por supermercado:\n\n";
    for (const [supermarket, products] of Object.entries(pricesBySupermarket)) {
      pricesInfo += `${supermarket}:\n`;
      products.forEach(p => {
        pricesInfo += `  - ${p.product}${p.brand ? ` (${p.brand})` : ''}: €${p.price.toFixed(2)} por ${p.unit}\n`;
      });
      pricesInfo += '\n';
    }

    const prompt = `Eres un experto en optimización de compras de supermercado. Analiza la siguiente lista de compras y recomienda la mejor estrategia para comprar todos los artículos.

Lista de compras: "${listName}"
Artículos necesarios:
${itemsList}

${pricesInfo}

IMPORTANTE:
1. Calcula el costo total por supermercado si se compran TODOS los artículos disponibles allí
2. Si un artículo no está disponible en un supermercado, no lo incluyas en esa opción
3. Recomienda la estrategia más económica (puede ser un solo supermercado o una combinación)
4. Sé específico sobre qué comprar en cada lugar y por qué

Responde en formato JSON con esta estructura exacta:
{
  "recommendations": [
    {
      "supermarket": "Nombre del supermercado",
      "items": ["item1", "item2"],
      "totalPrice": 0.00,
      "reasoning": "Explicación breve"
    }
  ],
  "summary": "Resumen general de la mejor estrategia de compra en español, incluyendo el ahorro total estimado"
}`;

    console.log('Calling AI with prompt length:', prompt.length);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un asistente experto en optimización de compras. Siempre respondes en formato JSON válido." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    
    const content = aiData.choices[0].message.content;
    
    // Try to extract JSON from the response
    let parsedContent;
    try {
      // Try to find JSON in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[1]);
      } else {
        parsedContent = JSON.parse(content);
      }
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", content);
      // Fallback response
      parsedContent = {
        recommendations: [],
        summary: "No se pudo generar una recomendación en este momento. Por favor, intenta nuevamente."
      };
    }

    console.log('Successfully parsed recommendations:', parsedContent.recommendations?.length || 0);

    return new Response(
      JSON.stringify(parsedContent),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in list-recommendations function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        recommendations: [],
        summary: "Ocurrió un error al generar las recomendaciones."
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
