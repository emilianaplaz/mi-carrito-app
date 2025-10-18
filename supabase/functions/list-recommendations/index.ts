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

    // Group prices by supermarket and product for detailed calculation
    const pricesBySupermarket: Record<string, any[]> = {};
    const productPriceMap: Record<string, any[]> = {};
    
    availablePrices.forEach((price: any) => {
      const supermarketName = price.supermarkets?.name || "Desconocido";
      const productKey = `${price.product_name}-${price.brands?.name || 'sin marca'}`;
      
      if (!pricesBySupermarket[supermarketName]) {
        pricesBySupermarket[supermarketName] = [];
      }
      
      const priceInfo = {
        product: price.product_name,
        brand: price.brands?.name,
        price: parseFloat(price.price),
        unit: price.unit,
        supermarket: supermarketName,
      };
      
      pricesBySupermarket[supermarketName].push(priceInfo);
      
      if (!productPriceMap[productKey]) {
        productPriceMap[productKey] = [];
      }
      productPriceMap[productKey].push(priceInfo);
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

    const prompt = `Eres un experto en optimización de compras de supermercado. Analiza la siguiente lista de compras y usa ÚNICAMENTE los precios reales de la base de datos para hacer recomendaciones precisas.

Lista de compras: "${listName}"
Artículos necesarios:
${itemsList}

${pricesInfo}

REGLAS CRÍTICAS:
1. SOLO usa los precios exactos de la base de datos proporcionados arriba
2. Calcula el precio total REAL sumando los precios individuales de cada producto
3. Si un supermercado tiene TODOS los artículos, esa puede ser la mejor opción (considera la comodidad)
4. Si ningún supermercado tiene todos los artículos, DEBES sugerir COMBINACIONES
5. Para combinaciones, calcula el precio EXACTO sumando precios de diferentes supermercados
6. Compara: a veces pagar un poco más por conveniencia (un solo lugar) es mejor que ahorrar €1-2 visitando múltiples tiendas
7. Ordena las recomendaciones considerando PRECIO y CONVENIENCIA

FORMATO DE RESPUESTA OBLIGATORIO (JSON):
{
  "recommendations": [
    {
      "supermarket": "Nombre del supermercado O 'Combinación: Super1 + Super2'",
      "items": [
        {
          "item": "nombre del producto",
          "price": precio_exacto_en_euros,
          "brand": "marca",
          "supermarket": "donde comprarlo si es combinación"
        }
      ],
      "totalPrice": suma_exacta_de_todos_los_precios,
      "reasoning": "Explica claramente por qué esta opción. Si es combinación, detalla el plan y el ahorro vs comprar todo en un lugar",
      "isCombination": true/false
    }
  ],
  "summary": "Resumen en español: explica la mejor estrategia considerando precio Y conveniencia. Si recomiendas combinación, justifica que el ahorro vale la pena visitar múltiples tiendas"
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
