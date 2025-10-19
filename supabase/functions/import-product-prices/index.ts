import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting product prices import...');

    // Sample of the data - you'll need to add ALL the rows from the Excel
    const products = [
      {subcategoria: "Aceites De Coco", producto: "Aceite De Coco Virgen Kaldini Tarro Vidrio × 500Ml", marca: "Kaldini", presentacion: "500 ml", mercado: "Central Madeirense", precio: 16.68},
      {subcategoria: "Aceites De Coco", producto: "Aceite De Coco Virgen Kaldini Tarro Vidrio × 500Ml", marca: "Kaldini", presentacion: "500 ml", mercado: "Farmatodo", precio: 17.17},
      {subcategoria: "Aceites De Coco", producto: "Aceite De Coco Virgen Kaldini Tarro Vidrio × 500Ml", marca: "Kaldini", presentacion: "500 ml", mercado: "Plansuarez", precio: 13.87},
      // Add all other products here...
    ];

    // Insert in batches of 1000
    const batchSize = 1000;
    let imported = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const { error } = await supabase
        .from('product_prices')
        .insert(batch);
      
      if (error) {
        console.error('Batch error:', error);
        throw error;
      }
      
      imported += batch.length;
      console.log(`Imported ${imported} of ${products.length} products`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${imported} products`,
        total: imported
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});