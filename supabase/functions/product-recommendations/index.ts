import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brandId, prices } = await req.json();
    
    console.log('Generating recommendations for:', productName);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get brand name
    const { data: brand } = await supabase
      .from('brands')
      .select('name')
      .eq('id', brandId)
      .single();

    // Format prices for AI
    const priceList = prices.map((p: any) => 
      `${p.supermarket_name}: $${p.price}/${p.unit}`
    ).join(', ');

    const systemPrompt = `Eres un asistente experto en compras de supermercado en España. 
Analiza los precios de productos y proporciona recomendaciones útiles sobre dónde comprar, 
calidad-precio, y consejos de ahorro. Mantén tus respuestas concisas y prácticas.`;

    const userPrompt = `Producto: ${productName}
Marca: ${brand?.name || 'Varias'}
Precios disponibles: ${priceList}

Proporciona:
1. Recomendación de dónde comprar (mejor relación calidad-precio)
2. Diferencia de precio entre la opción más cara y más barata
3. Un consejo de ahorro o alternativa`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const recommendation = data.choices[0].message.content;

    console.log('Recommendation generated successfully');

    return new Response(
      JSON.stringify({ recommendation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in product-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});