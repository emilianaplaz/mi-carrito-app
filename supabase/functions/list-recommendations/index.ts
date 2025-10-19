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
    const { listName, items, availablePrices, allSupermarkets } = await req.json();
    console.log('Received request:', { listName, itemCount: items.length, priceCount: availablePrices.length, supermarketCount: allSupermarkets?.length || 0 });

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
      const productName = price.product_name;
      if (!productName) return; // Skip if no product name
      
      const brandName = price.brand_name || undefined;
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
        availablePrices: prices,
        hasPrices: prices.length > 0
      };
    });

    // Track all items - both with and without prices
    const itemsWithoutPrices = itemsWithPrices.filter((it: any) => !it.hasPrices).map((it: any) => ({
      name: it.name,
      brand: it.brand
    }));

    // Calculate best options
    const supermarketOptions: any[] = [];
    let bestPartialOption: any | null = null;
    
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
    
    // Fallback: best single-supermarket partial coverage if no full match
    if (supermarketOptions.length === 0) {
      let best: any | null = null;
      for (const [supermarket, supermarketPrices] of Object.entries(pricesBySupermarket)) {
        const itemsFound: any[] = [];
        let total = 0;
        for (const item of items) {
          let priceInSupermarket: any | undefined;
          if (item.brand) {
            priceInSupermarket = (supermarketPrices as any[]).find(
              (p: any) => p.product === item.name && (p.brand || 'sin marca') === (item.brand || 'sin marca')
            );
          } else {
            const candidates = (supermarketPrices as any[]).filter((p: any) => p.product === item.name);
            priceInSupermarket = candidates.sort((a, b) => a.price - b.price)[0];
          }
          if (priceInSupermarket) {
            itemsFound.push({ item: item.name, price: priceInSupermarket.price, brand: priceInSupermarket.brand, supermarket });
            total += priceInSupermarket.price;
          }
        }
        if (itemsFound.length > 0) {
          if (!best || itemsFound.length > best.items.length || (itemsFound.length === best.items.length && total < best.totalPrice)) {
            best = { supermarket, items: itemsFound, totalPrice: total };
          }
        }
      }
      if (best) {
        supermarketOptions.push({ ...best, isCombination: false, missingCount: items.length - best.items.length });
      }
    }

    // Option 2: Find cheapest combination (allow partial and single-supermarket)
    const cheapestCombination: any[] = [];
    let combinationTotal = 0;
    const usedSupermarkets = new Set<string>();
    const missingItems: string[] = [];
    
    for (const item of items) {
      const productKey = `${item.name}-${item.brand || 'sin marca'}`;
      const prices = item.brand ? (productPriceMap[productKey] || []) : (productOnlyMap[item.name] || []);
      
      if (prices.length > 0) {
        const cheapest = prices.reduce((min: any, p: any) => (min && min.price <= p.price) ? min : p, undefined as any);
        if (cheapest) {
          cheapestCombination.push({ item: item.name, price: cheapest.price, brand: cheapest.brand, supermarket: cheapest.supermarket });
          combinationTotal += cheapest.price;
          usedSupermarkets.add(cheapest.supermarket);
        }
      } else {
        missingItems.push(item.name);
      }
    }
    
    if (cheapestCombination.length > 0) {
      supermarketOptions.push({
        supermarket: `Combinación: ${Array.from(usedSupermarkets).join(' + ') || 'Único supermercado'}`,
        items: cheapestCombination,
        totalPrice: combinationTotal,
        isCombination: true,
        missingCount: missingItems.length
      });
    }
    
    // Sort by price
    supermarketOptions.sort((a, b) => a.totalPrice - b.totalPrice);
    
    // CRITICAL: Prioritize complete coverage over price
    // Move options with all items to the front
    supermarketOptions.sort((a, b) => {
      const aMissing = a.missingCount || 0;
      const bMissing = b.missingCount || 0;
      
      // If one has all items and other doesn't, prioritize the complete one
      if (aMissing === 0 && bMissing > 0) return -1;
      if (bMissing === 0 && aMissing > 0) return 1;
      
      // If both complete or both incomplete, sort by price
      return a.totalPrice - b.totalPrice;
    });
    
    // Return structured data with all available prices
    const response = {
      allPrices: itemsWithPrices,
      itemsWithoutPrices: itemsWithoutPrices,
      recommendations: supermarketOptions.map((opt, index) => {
        const marketsCount = opt.isCombination ? new Set(opt.items.map((i: any) => i.supermarket)).size : 1;
        const hasAllItems = (opt.missingCount || 0) === 0;
        const missingNote = opt.missingCount && opt.missingCount > 0 ? ` Faltan ${opt.missingCount} producto(s).` : ' ¡Todos los productos disponibles!';
        
        const base = opt.isCombination
          ? `Combinación${marketsCount > 1 ? ` en ${marketsCount} supermercados` : ''} por €${opt.totalPrice.toFixed(2)}.`
          : `${opt.supermarket} por €${opt.totalPrice.toFixed(2)}.`;
        
        let prefix = '';
        if (index === 0 && hasAllItems) {
          prefix = '✓ RECOMENDADO: ';
        } else if (index === 0) {
          prefix = 'Mejor opción parcial: ';
        } else {
          prefix = 'Alternativa: ';
        }
        
        return { ...opt, reasoning: prefix + base + missingNote };
      }),
      summary: supermarketOptions.length > 0
        ? (() => {
            const best = supermarketOptions[0];
            const marketsCount = best.isCombination ? new Set(best.items.map((i: any) => i.supermarket)).size : 1;
            const hasAllItems = (best.missingCount || 0) === 0;
            
            if (!hasAllItems) {
              return `Ningún supermercado tiene todos los productos. La mejor opción parcial es ${best.supermarket} con ${best.items.length} de ${items.length} artículos por €${best.totalPrice.toFixed(2)}.`;
            }
            
            return best.isCombination
              ? `¡Puedes conseguir TODOS los productos! La opción más completa es combinar ${marketsCount} supermercados por €${best.totalPrice.toFixed(2)}.`
              : `¡Puedes conseguir TODOS los productos en ${best.supermarket} por €${best.totalPrice.toFixed(2)}!`;
          })()
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
