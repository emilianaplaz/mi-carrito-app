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
    const { csvData } = await req.json();
    
    if (!csvData) {
      return new Response(
        JSON.stringify({ error: 'No CSV data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting product prices import...');

    // Parse CSV - skip header row
    const lines = csvData.trim().split('\n');
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV line (handle commas in quoted fields)
      const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
      if (!matches || matches.length < 6) continue;
      
      const [subcategoria, producto, marca, presentacion, mercado, precioStr] = matches.map(
        (field: string) => field.replace(/^"|"$/g, '').trim()
      );
      
      const precio = parseFloat(precioStr);
      if (isNaN(precio)) continue;
      
      products.push({
        subcategoria,
        producto,
        marca,
        presentacion,
        mercado,
        precio
      });
    }

    console.log(`Parsed ${products.length} products from CSV`);

    // Clear existing data
    console.log('Clearing existing product_prices data...');
    const { error: deleteError } = await supabase
      .from('product_prices')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw deleteError;
    }

    // Insert in batches of 500 (Supabase limit)
    const batchSize = 500;
    let imported = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const { error } = await supabase
        .from('product_prices')
        .insert(batch);
      
      if (error) {
        console.error('Batch error at row', i, ':', error);
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