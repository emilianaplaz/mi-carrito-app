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
    const { listName, items, availablePrices, allSupermarkets, budget } = await req.json();
    console.log('Received request:', { listName, itemCount: items.length, priceCount: availablePrices.length, supermarketCount: allSupermarkets?.length || 0, budget });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Group prices by supermarket and product for detailed calculation
    const pricesBySupermarket: Record<string, any[]> = {};
    const productPriceMap: Record<string, any[]> = {};
    const productOnlyMap: Record<string, any[]> = {};
    
    availablePrices.forEach((price: any) => {
      const supermarketName = price.mercado || "Desconocido";
      const productName = price.producto;
      if (!productName) return; // Skip if no product name
      
      const brandName = price.marca || undefined;
      const productKey = `${productName}-${brandName || 'sin marca'}`;
      
      if (!pricesBySupermarket[supermarketName]) {
        pricesBySupermarket[supermarketName] = [];
      }
      
      const priceInfo = {
        product: productName,
        brand: brandName,
        price: parseFloat(price.precio),
        unit: price.presentacion,
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
    
    if (itemsWithoutPrices.length > 0) {
      console.log('Items without any prices in database:', itemsWithoutPrices.map((i: any) => i.name).join(', '));
    }

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

    // Option 2: Generate multiple combination strategies
    // Strategy 1: Cheapest combination (picks lowest price for each item)
    const cheapestCombination: any[] = [];
    let combinationTotal = 0;
    const usedSupermarkets = new Set<string>();
    const cheapestMissingItems: string[] = [];
    
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
        cheapestMissingItems.push(item.name);
      }
    }
    
    if (cheapestCombination.length > 0) {
      supermarketOptions.push({
        supermarket: `Combinación: ${Array.from(usedSupermarkets).join(' + ') || 'Único supermercado'}`,
        items: cheapestCombination,
        totalPrice: combinationTotal,
        isCombination: true,
        missingCount: cheapestMissingItems.length
      });
    }
    
    // Strategy 2: Try to build complete coverage combinations by exploring different supermarket sets
    // This ensures we find complete coverage options even if they're not the absolute cheapest
    if (cheapestMissingItems.length > 0) {
      console.log('Cheapest combination is missing items, exploring alternative combinations...');
      
      // Get all unique supermarkets
      const allSupermarketsSet = new Set(Object.keys(pricesBySupermarket));
      
      // Build supermarket coverage map
      const supermarketCoverage: { name: string; itemCount: number; items: Set<string>; priceMap: Map<string, any> }[] = [];
      for (const [supermarket, prices] of Object.entries(pricesBySupermarket)) {
        const coveredItems = new Set<string>();
        const priceMap = new Map<string, any>();
        for (const item of items) {
          const matchingPrice = (prices as any[]).find((p: any) => 
            p.product === item.name && (!item.brand || (p.brand || 'sin marca') === (item.brand || 'sin marca'))
          );
          if (matchingPrice) {
            coveredItems.add(item.name);
            priceMap.set(item.name, matchingPrice);
          }
        }
        supermarketCoverage.push({ name: supermarket, itemCount: coveredItems.size, items: coveredItems, priceMap });
      }
      
      // Sort by coverage (most items first)
      supermarketCoverage.sort((a, b) => b.itemCount - a.itemCount);
      
      // STRATEGY: Build combinations that minimize store count
      // Try 2-store, 3-store, etc combinations intelligently
      
      for (let maxStores = 2; maxStores <= Math.min(5, supermarketCoverage.length); maxStores++) {
        // Try combinations starting with top coverage supermarkets
        const tryBuildCombination = (startIdx: number, currentStores: typeof supermarketCoverage, depth: number): any => {
          if (currentStores.length >= maxStores || depth > supermarketCoverage.length) return null;
          
          const coveredItems = new Set<string>();
          const combinationItems: any[] = [];
          let combinationTotal = 0;
          
          // Combine items from selected stores
          for (const store of currentStores) {
            for (const item of items) {
              if (!coveredItems.has(item.name) && store.items.has(item.name)) {
                const price = store.priceMap.get(item.name);
                if (price) {
                  combinationItems.push({
                    item: item.name,
                    price: price.price,
                    brand: price.brand,
                    supermarket: store.name
                  });
                  combinationTotal += price.price;
                  coveredItems.add(item.name);
                }
              }
            }
          }
          
          // If complete, return it
          if (coveredItems.size === items.length) {
            return {
              items: combinationItems,
              total: combinationTotal,
              stores: currentStores.map(s => s.name)
            };
          }
          
          // If not complete and can add more stores, try adding next best store
          if (currentStores.length < maxStores && startIdx < supermarketCoverage.length) {
            for (let i = startIdx; i < supermarketCoverage.length; i++) {
              const nextStore = supermarketCoverage[i];
              // Only add if it contributes new items
              const wouldAddItems = Array.from(nextStore.items).some(itemName => !coveredItems.has(itemName));
              if (wouldAddItems) {
                const result = tryBuildCombination(i + 1, [...currentStores, nextStore], depth + 1);
                if (result) return result;
              }
            }
          }
          
          return null;
        };
        
        // Try building with this number of stores
        for (let i = 0; i < supermarketCoverage.length && i < 3; i++) {
          const result = tryBuildCombination(i + 1, [supermarketCoverage[i]], 0);
          if (result) {
            const storeNames = result.stores.join(' + ');
            // Check if we already have this combination
            const alreadyExists = supermarketOptions.some(opt => 
              opt.isCombination && opt.supermarket === `Combinación: ${storeNames}`
            );
            if (!alreadyExists) {
              supermarketOptions.push({
                supermarket: `Combinación: ${storeNames}`,
                items: result.items,
                totalPrice: result.total,
                isCombination: true,
                missingCount: 0
              });
              console.log(`Found ${maxStores}-store complete combination: ${storeNames} for $${result.total.toFixed(2)}`);
              break; // Found one for this store count, move to next
            }
          }
        }
      }
    }
    
    // CRITICAL SORTING: Prioritize complete coverage, then minimum stores, then cost
    supermarketOptions.sort((a, b) => {
      const aMissing = a.missingCount || 0;
      const bMissing = b.missingCount || 0;
      
      // 1. Prioritize complete coverage (all items) over partial
      if (aMissing === 0 && bMissing > 0) return -1;
      if (bMissing === 0 && aMissing > 0) return 1;
      
      // If both are incomplete, prioritize more items covered
      if (aMissing !== bMissing) return aMissing - bMissing;
      
      // 2. Among equal coverage, prioritize fewer stores
      const aStores = a.isCombination ? new Set(a.items.map((i: any) => i.supermarket)).size : 1;
      const bStores = b.isCombination ? new Set(b.items.map((i: any) => i.supermarket)).size : 1;
      if (aStores !== bStores) return aStores - bStores;
      
      // 3. Finally, prioritize lower cost
      return a.totalPrice - b.totalPrice;
    });
    
    // Filter by budget if provided
    let withinBudget = supermarketOptions;
    let exceededBudget: any[] = [];
    
    if (budget && budget > 0) {
      withinBudget = supermarketOptions.filter(opt => opt.totalPrice <= budget);
      exceededBudget = supermarketOptions.filter(opt => opt.totalPrice > budget);
      
      // If budget prevents complete coverage, consider showing exceededBudget options that are complete
      const completeWithinBudget = withinBudget.filter(opt => (opt.missingCount || 0) === 0);
      const completeExceedsBudget = exceededBudget.filter(opt => (opt.missingCount || 0) === 0);
      
      // If no complete options within budget but there are complete options that exceed it,
      // keep the sorting but maintain both lists
      if (completeWithinBudget.length === 0 && completeExceedsBudget.length > 0) {
        // Sort exceededBudget with same priority logic
        exceededBudget.sort((a, b) => {
          const aMissing = a.missingCount || 0;
          const bMissing = b.missingCount || 0;
          if (aMissing === 0 && bMissing > 0) return -1;
          if (bMissing === 0 && aMissing > 0) return 1;
          if (aMissing !== bMissing) return aMissing - bMissing;
          const aStores = a.isCombination ? new Set(a.items.map((i: any) => i.supermarket)).size : 1;
          const bStores = b.isCombination ? new Set(b.items.map((i: any) => i.supermarket)).size : 1;
          if (aStores !== bStores) return aStores - bStores;
          return a.totalPrice - b.totalPrice;
        });
      }
    }
    
    // Return structured data with all available prices
    const response = {
      allPrices: itemsWithPrices,
      itemsWithoutPrices: itemsWithoutPrices,
      recommendations: withinBudget.map((opt, index) => {
        const marketsCount = opt.isCombination ? new Set(opt.items.map((i: any) => i.supermarket)).size : 1;
        const hasAllItems = (opt.missingCount || 0) === 0;
        const missingNote = opt.missingCount && opt.missingCount > 0 ? ` Faltan ${opt.missingCount} producto(s).` : ' ¡Todos los productos disponibles!';
        
        const base = opt.isCombination
          ? `Combinación${marketsCount > 1 ? ` en ${marketsCount} supermercados` : ''} por $${opt.totalPrice.toFixed(2)}.`
          : `${opt.supermarket} por $${opt.totalPrice.toFixed(2)}.`;
        
        let prefix = '';
        if (index === 0 && hasAllItems) {
          prefix = '✓ RECOMENDADO: ';
        } else if (index === 0) {
          prefix = 'Mejor opción parcial: ';
        } else {
          prefix = 'Alternativa: ';
        }
        
        const budgetNote = budget && budget > 0 ? ` (Dentro del presupuesto de $${budget.toFixed(2)})` : '';
        
        return { ...opt, reasoning: prefix + base + missingNote + budgetNote };
      }),
      budgetExceeded: budget && budget > 0 && exceededBudget.length > 0 ? exceededBudget.map((opt, index) => {
        const marketsCount = opt.isCombination ? new Set(opt.items.map((i: any) => i.supermarket)).size : 1;
        const hasAllItems = (opt.missingCount || 0) === 0;
        const missingNote = opt.missingCount && opt.missingCount > 0 ? ` Faltan ${opt.missingCount} producto(s).` : ' ¡Todos los productos disponibles!';
        
        const base = opt.isCombination
          ? `Combinación${marketsCount > 1 ? ` en ${marketsCount} supermercados` : ''} por $${opt.totalPrice.toFixed(2)}.`
          : `${opt.supermarket} por $${opt.totalPrice.toFixed(2)}.`;
        
        return { ...opt, reasoning: `⚠️ Excede presupuesto: ${base} ${missingNote} (Excede por $${(opt.totalPrice - budget).toFixed(2)})` };
      }) : [],
      summary: withinBudget.length > 0
        ? (() => {
            const best = withinBudget[0];
            const marketsCount = best.isCombination ? new Set(best.items.map((i: any) => i.supermarket)).size : 1;
            const hasAllItems = (best.missingCount || 0) === 0;
            const budgetNote = budget && budget > 0 ? ` dentro del presupuesto de $${budget.toFixed(2)}` : '';
            
            if (!hasAllItems) {
              return `Ningún supermercado tiene todos los productos${budgetNote}. La mejor opción parcial es ${best.supermarket} con ${best.items.length} de ${items.length} artículos por $${best.totalPrice.toFixed(2)}.`;
            }
            
            return best.isCombination
              ? `¡Puedes conseguir TODOS los productos${budgetNote}! La opción más completa es combinar ${marketsCount} supermercados por $${best.totalPrice.toFixed(2)}.`
              : `¡Puedes conseguir TODOS los productos en ${best.supermarket} por $${best.totalPrice.toFixed(2)}${budgetNote}!`;
          })()
        : budget && budget > 0 && exceededBudget.length > 0
          ? `⚠️ Ninguna opción está dentro del presupuesto de $${budget.toFixed(2)}. La opción más económica cuesta $${exceededBudget[0].totalPrice.toFixed(2)}.`
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
