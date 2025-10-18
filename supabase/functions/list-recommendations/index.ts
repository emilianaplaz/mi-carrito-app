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
    const productOnlyMap: Record<string, any[]> = {};
    
    availablePrices.forEach((price: any) => {
      const supermarketName = price.supermarkets?.name || "Desconocido";
      const productName = price.products?.name;
      if (!productName) return; // Skip if no product name
      
      const brandName = price.brands?.name || undefined;
      const productKey = `${productName}-${brandName || 'sin marca'}`;
      
      if (!pricesBySupermarket[supermarketName]) {
        pricesBySupermarket[supermarketName] = [];
      }
      
      const priceInfo = {
        product: productName,
        brand: brandName,
        price: parseFloat(price.price),
        unit: price.unit,
        supermarket: supermarketName,
      };
      
      pricesBySupermarket[supermarketName].push(priceInfo);
      
      if (!productPriceMap[productKey]) {
        productPriceMap[productKey] = [];
      }
      productPriceMap[productKey].push(priceInfo);

      if (!productOnlyMap[productName]) {
        productOnlyMap[productName] = [];
      }
      productOnlyMap[productName].push(priceInfo);
    });

    // Build detailed price comparison for each item
    const itemsWithPrices = items.map((item: any) => {
      const productKey = `${item.name}-${item.brand || 'sin marca'}`;
      const prices = item.brand ? (productPriceMap[productKey] || []) : (productOnlyMap[item.name] || []);
      return {
        name: item.name,
        brand: item.brand,
        availablePrices: prices
      };
    });

    // Calculate best options
    const supermarketOptions: any[] = [];
    
    // Option 1: Check each supermarket to see if they have all items
    for (const [supermarket, supermarketPrices] of Object.entries(pricesBySupermarket)) {
      const itemsInSupermarket: any[] = [];
      let hasAllItems = true;
      
      for (const item of items) {
        let priceInSupermarket: any | undefined;
        if (item.brand) {
          // Match exact brand when provided
          priceInSupermarket = (supermarketPrices as any[]).find(
            (p: any) => p.product === item.name && (p.brand || 'sin marca') === (item.brand || 'sin marca')
          );
        } else {
          // If no brand specified, take the cheapest option for that product in this supermarket
          const candidates = (supermarketPrices as any[]).filter((p: any) => p.product === item.name);
          priceInSupermarket = candidates.sort((a, b) => a.price - b.price)[0];
        }
        
        if (priceInSupermarket) {
          itemsInSupermarket.push({
            item: item.name,
            price: priceInSupermarket.price,
            brand: priceInSupermarket.brand,
            supermarket: supermarket
          });
        } else {
          hasAllItems = false;
          break;
        }
      }
      
      if (hasAllItems) {
        const totalPrice = itemsInSupermarket.reduce((sum, item) => sum + item.price, 0);
        supermarketOptions.push({
          supermarket: supermarket,
          items: itemsInSupermarket,
          totalPrice: totalPrice,
          isCombination: false
        });
      }
    }
    
    // Option 2: Find cheapest combination
    const cheapestCombination: any[] = [];
    let combinationTotal = 0;
    const usedSupermarkets = new Set<string>();
    
    for (const item of items) {
      const productKey = `${item.name}-${item.brand || 'sin marca'}`;
      const prices = item.brand ? (productPriceMap[productKey] || []) : (productOnlyMap[item.name] || []);
      
      if (prices.length > 0) {
        const cheapest = prices.reduce((min: any, p: any) => p.price < min.price ? p : min);
        cheapestCombination.push({
          item: item.name,
          price: cheapest.price,
          brand: cheapest.brand,
          supermarket: cheapest.supermarket
        });
        combinationTotal += cheapest.price;
        usedSupermarkets.add(cheapest.supermarket);
      }
    }
    
    if (cheapestCombination.length === items.length && usedSupermarkets.size > 1) {
      supermarketOptions.push({
        supermarket: `Combinación: ${Array.from(usedSupermarkets).join(' + ')}`,
        items: cheapestCombination,
        totalPrice: combinationTotal,
        isCombination: true
      });
    }
    
    // Sort by price
    supermarketOptions.sort((a, b) => a.totalPrice - b.totalPrice);
    
    // Return structured data with all available prices
    const response = {
      allPrices: itemsWithPrices,
      recommendations: supermarketOptions.map((opt, index) => ({
        ...opt,
        reasoning: index === 0 
          ? (opt.isCombination 
            ? `Esta combinación ofrece el precio más bajo (€${opt.totalPrice.toFixed(2)}). Tendrás que visitar ${usedSupermarkets.size} supermercados diferentes.`
            : `${opt.supermarket} tiene todos los artículos en un solo lugar por €${opt.totalPrice.toFixed(2)}.`)
          : (opt.isCombination
            ? `Combinación alternativa por €${opt.totalPrice.toFixed(2)}.`
            : `En ${opt.supermarket} pagarías €${opt.totalPrice.toFixed(2)} comprando todo en un solo lugar.`)
      })),
      summary: supermarketOptions.length > 0
        ? (supermarketOptions[0].isCombination
          ? `La opción más económica es combinar supermercados (€${supermarketOptions[0].totalPrice.toFixed(2)}), pero ${supermarketOptions.find(o => !o.isCombination) ? `si prefieres comodidad, puedes comprar todo en ${supermarketOptions.find(o => !o.isCombination)?.supermarket} por €${supermarketOptions.find(o => !o.isCombination)?.totalPrice.toFixed(2)}` : 'no hay un solo supermercado con todos los artículos'}.`
          : `La mejor opción es ${supermarketOptions[0].supermarket} donde puedes comprar todo por €${supermarketOptions[0].totalPrice.toFixed(2)}.`)
        : "No se encontraron precios suficientes para hacer recomendaciones."
    };

    console.log('Calculated recommendations:', response.recommendations.length);

    return new Response(
      JSON.stringify(response),
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
