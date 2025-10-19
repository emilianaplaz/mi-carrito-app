import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Store, Sparkles, Loader2, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CartButton } from "@/components/Cart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
type GroceryItem = {
  name: string;
  brand: string;
  amount?: string;
  unit?: string;
};
type GroceryList = {
  id: string;
  name: string;
  items: GroceryItem[];
};
type ItemWithPrice = {
  item: string;
  price: number;
  brand?: string;
  supermarket?: string;
};
type SupermarketRecommendation = {
  supermarket: string;
  items: ItemWithPrice[];
  totalPrice: number;
  reasoning: string;
  isCombination?: boolean;
  missingCount?: number;
};
type ItemPriceComparison = {
  name: string;
  brand?: string;
  availablePrices: {
    product: string;
    brand?: string;
    price: number;
    unit: string;
    supermarket: string;
  }[];
  hasPrices?: boolean;
};
type MissingItem = {
  name: string;
  brand?: string;
};
const ComprarLista = () => {
  const [searchParams] = useSearchParams();
  const listId = searchParams.get("id") || "";
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<GroceryList | null>(null);
  const [recommendations, setRecommendations] = useState<SupermarketRecommendation[]>([]);
  const [allPrices, setAllPrices] = useState<ItemPriceComparison[]>([]);
  const [itemsWithoutPrices, setItemsWithoutPrices] = useState<MissingItem[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [itemBrandPreferences, setItemBrandPreferences] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    addItem
  } = useCart();
  const handleAddToCart = (supermarket: string, items: ItemWithPrice[]) => {
    items.forEach(item => {
      addItem({
        name: item.item,
        brand: item.brand,
        quantity: 1,
        price: item.price,
        unit: "unidad",
        supermarket
      });
    });
    toast({
      title: "¡Agregado al carrito!",
      description: `${items.length} productos de ${supermarket} agregados`
    });
  };
  useEffect(() => {
    loadList();
  }, [listId]);
  const loadList = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      const {
        data,
        error
      } = await supabase.from("grocery_lists").select("*").eq("id", listId).eq("user_id", session.user.id).single();
      if (error) throw error;
      const formattedList: GroceryList = {
        ...data,
        items: Array.isArray(data.items) ? data.items as GroceryItem[] : []
      };

      // Initialize brand preferences from list items
      const initialPreferences: Record<string, string> = {};
      formattedList.items.forEach(item => {
        initialPreferences[item.name] = item.brand || "ANY";
      });
      setItemBrandPreferences(initialPreferences);
      setList(formattedList);
      await loadRecommendations(formattedList);
    } catch (error: any) {
      console.error("Error loading list:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la lista",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadRecommendations = async (groceryList: GroceryList) => {
    setLoadingRecommendations(true);
    try {
      // Apply brand preferences to items
      const itemsWithPreferences = groceryList.items.map(item => ({
        ...item,
        brand: itemBrandPreferences[item.name] === "ANY" ? undefined : itemBrandPreferences[item.name]
      }));

      // Fetch ALL product prices to do fuzzy matching
      const { data: allPricesData, error: pricesError } = await supabase
        .from("product_prices")
        .select(`
          precio,
          presentacion,
          marca,
          subcategoria,
          mercado
        `);
      if (pricesError) throw pricesError;

      // Create a fuzzy matcher function
      const normalize = (str: string) => 
        str.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents
          .replace(/\s+/g, ' ')
          .trim();

      const fuzzyMatch = (searchTerm: string, subcategoria: string): boolean => {
        const normSearch = normalize(searchTerm);
        const normSub = normalize(subcategoria);
        
        // Direct match
        if (normSub.includes(normSearch) || normSearch.includes(normSub)) return true;
        
        // Split and check each word
        const searchWords = normSearch.split(' ');
        const subWords = normSub.split(' ');
        
        // Check if any significant word matches (length > 3)
        return searchWords.some(sw => 
          sw.length > 3 && subWords.some(subw => 
            subw.includes(sw) || sw.includes(subw)
          )
        );
      };

      // Filter prices to only matching items using fuzzy matching
      const matchedPrices = (allPricesData || []).filter((price: any) => 
        groceryList.items.some(item => fuzzyMatch(item.name, price.subcategoria))
      );

      // Fetch ALL supermarkets to show complete breakdown
      const {
        data: allSupermarkets
      } = await supabase.from("supermarkets").select("name").order("name");
      const { data, error } = await supabase.functions.invoke('list-recommendations', {
        body: {
          listName: groceryList.name,
          items: itemsWithPreferences,
          availablePrices: matchedPrices || [],
          allSupermarkets: (allSupermarkets || []).map((s: any) => s.name)
        }
      });
      if (error) throw error;

      // Sort each item's available prices by price (cheapest first)
      const sortedAllPrices = (data.allPrices || []).map((item: ItemPriceComparison) => ({
        ...item,
        availablePrices: [...item.availablePrices].sort((a, b) => a.price - b.price)
      }));
      setRecommendations(data.recommendations || []);
      setAllPrices(sortedAllPrices);
      setItemsWithoutPrices(data.itemsWithoutPrices || []);
      setAiSummary(data.summary || "");
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las recomendaciones",
        variant: "destructive"
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };
  const handleBrandChange = (itemName: string, brand: string) => {
    setItemBrandPreferences(prev => ({
      ...prev,
      [itemName]: brand
    }));
  };
  const handleRefreshRecommendations = () => {
    if (list) {
      loadRecommendations(list);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>;
  }
  if (!list) {
    return <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Lista no encontrada</h2>
          <Button onClick={() => navigate("/listas")}>Volver a Listas</Button>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/listas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Comprar: {list.name}</span>
            </div>
          </div>
          <CartButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Brand Selection Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Preferencias de Marca</h2>
            
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Selecciona "ANY" para buscar el mejor precio entre todas las marcas, o elige una marca específica
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list?.items.map((item, index) => {
            const availableBrands = allPrices.find(p => p.name.toLowerCase() === item.name.toLowerCase())?.availablePrices.map(p => p.brand).filter((brand, idx, arr) => brand && arr.indexOf(brand) === idx) || [];
            return <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.amount && <p className="text-xs text-muted-foreground">
                        {item.amount} {item.unit || ""}
                      </p>}
                  </div>
                  <Select value={itemBrandPreferences[item.name] || "ANY"} onValueChange={value => handleBrandChange(item.name, value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">ANY (Mejor precio)</SelectItem>
                      {availableBrands.map(brand => <SelectItem key={brand} value={brand || "sin marca"}>
                          {brand || "Sin marca"}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>;
          })}
          </div>
        </Card>

        {/* Loading state */}
        {loadingRecommendations ? <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analizando mejores opciones de compra...</span>
            </div>
          </Card> : <>
            {/* AI Smart Recommendations - TOP PRIORITY */}
            {aiSummary && recommendations.length > 0 && <Card className={`p-6 mb-6 border-2 ${(recommendations[0].missingCount || 0) === 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-500/30' : 'bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-500/30'}`}>
                <div className="flex items-start gap-3 mb-4">
                  <Sparkles className={`h-7 w-7 mt-1 flex-shrink-0 ${(recommendations[0].missingCount || 0) === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
                  <div className="flex-1">
                    <h2 className={`text-2xl font-bold mb-2 ${(recommendations[0].missingCount || 0) === 0 ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
                      {(recommendations[0].missingCount || 0) === 0 ? '✓ Plan de Compra Completo' : '⚠️ Plan de Compra Parcial'}
                    </h2>
                    <p className="text-base text-foreground mb-4">{aiSummary}</p>
                    
                    {/* Best recommendation details */}
                    <div className={`rounded-lg p-4 border ${(recommendations[0].missingCount || 0) === 0 ? 'bg-white/60 dark:bg-black/20 border-green-200 dark:border-green-800' : 'bg-white/60 dark:bg-black/20 border-orange-200 dark:border-orange-800'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Store className={`h-8 w-8 ${(recommendations[0].missingCount || 0) === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
                          <div>
                            <h3 className="font-bold text-lg">{recommendations[0].supermarket}</h3>
                            <p className="text-sm text-muted-foreground">
                              {recommendations[0].items.length} de {list.items.length} artículos • €{recommendations[0].totalPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-bold ${(recommendations[0].missingCount || 0) === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            €{recommendations[0].totalPrice.toFixed(2)}
                          </p>
                          <p className={`text-xs font-semibold ${(recommendations[0].missingCount || 0) === 0 ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`}>
                            {(recommendations[0].missingCount || 0) === 0 ? '¡Cobertura Total!' : 'Cobertura Parcial'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground italic mb-4">{recommendations[0].reasoning}</p>
                      <Button className="w-full" size="lg" onClick={() => handleAddToCart(recommendations[0].supermarket, recommendations[0].items)}>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Agregar Todo al Carrito
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>}

            {/* All Supermarket Options - Visual Breakdown */}
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Desglose por Supermercado</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Ve dónde puedes encontrar cada producto y compara precios
              </p>

              <div className="space-y-4">
                {allPrices.length > 0 && (() => {
              // Build supermarket breakdown - match original list items with prices
              const supermarketMap = new Map<string, {
                available: any[];
                missing: string[];
                total: number;
              }>();

              // For each item in the original list, find the cheapest option at each supermarket
              list.items.forEach(listItem => {
                const priceData = allPrices.find(p => p.name.toLowerCase() === listItem.name.toLowerCase());
                if (priceData && priceData.availablePrices.length > 0) {
                  // Group by supermarket and pick cheapest for this list item
                  const bySupermarket = new Map<string, any>();
                  priceData.availablePrices.forEach((price: any) => {
                    if (!bySupermarket.has(price.supermarket) || bySupermarket.get(price.supermarket).price > price.price) {
                      bySupermarket.set(price.supermarket, price);
                    }
                  });

                  // Add to each supermarket's available list
                  bySupermarket.forEach((price, supermarketName) => {
                    if (!supermarketMap.has(supermarketName)) {
                      supermarketMap.set(supermarketName, {
                        available: [],
                        missing: [],
                        total: 0
                      });
                    }
                    supermarketMap.get(supermarketName)!.available.push({
                      name: listItem.name,
                      brand: price.brand,
                      price: price.price,
                      unit: price.unit,
                      amount: listItem.amount || "1"
                    });
                    supermarketMap.get(supermarketName)!.total += price.price;
                  });
                }
              });

              // Add missing items
              allPrices.forEach(item => {
                supermarketMap.forEach((data, supermarket) => {
                  const hasItem = data.available.some((a: any) => a.name === item.name);
                  if (!hasItem && item.hasPrices) {
                    data.missing.push(item.name);
                  }
                });
              });
              return Array.from(supermarketMap.entries()).sort((a, b) => b[1].available.length - a[1].available.length).map(([supermarket, data], index) => <div key={supermarket} className="border rounded-lg p-4 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Store className={`h-6 w-6 ${index === 0 ? 'text-green-600' : 'text-primary'}`} />
                            <div>
                              <h3 className="font-bold text-lg">{supermarket}</h3>
                              <p className="text-sm text-muted-foreground">
                                {data.available.length} de {list.items.length} productos disponibles
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">€{data.total.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {(data.available.length / list.items.length * 100).toFixed(0)}% cobertura
                            </p>
                            <Button size="sm" className="mt-2" onClick={() => {
                      const itemsForCart = data.available.map((prod: any) => ({
                        item: prod.name,
                        brand: prod.brand,
                        price: prod.price
                      }));
                      handleAddToCart(supermarket, itemsForCart);
                    }}>
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Agregar al Carrito
                            </Button>
                          </div>
                        </div>

                        {/* Available products */}
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                            ✓ Productos Disponibles ({data.available.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {data.available.map((prod: any, idx: number) => <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="font-medium">{prod.name}</span>
                                  {prod.brand && <span className="text-xs text-muted-foreground">({prod.brand})</span>}
                                </div>
                                <span className="font-semibold text-green-700 dark:text-green-400">€{prod.price.toFixed(2)}</span>
                              </div>)}
                          </div>
                        </div>

                        {/* Missing products */}
                        {data.missing.length > 0 && <div>
                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
                              ✗ No Disponibles ({data.missing.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {data.missing.map((prod: string, idx: number) => <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  <span className="text-muted-foreground">{prod}</span>
                                </div>)}
                            </div>
                          </div>}
                      </div>);
            })()}
              </div>
            </Card>

            {/* Items without any prices */}
            {itemsWithoutPrices.length > 0 && <Card className="p-6 mb-6 border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/20">
                <h2 className="text-xl font-semibold mb-4 text-red-700 dark:text-red-400">
                  ⚠️ Artículos Sin Precios en Ningún Supermercado
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Estos productos no están en nuestra base de datos:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {itemsWithoutPrices.map((item, index) => <div key={index} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-background/50 border border-red-200 dark:border-red-800">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="font-medium">{item.name}</span>
                      {item.brand && <span className="text-muted-foreground">({item.brand})</span>}
                    </div>)}
                </div>
              </Card>}

          </>}
        
        {!loadingRecommendations && recommendations.length === 0 && <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay recomendaciones disponibles</h3>
            <p className="text-muted-foreground mb-4">
              No se encontraron precios suficientes para los artículos de tu lista
            </p>
            <Button onClick={() => navigate("/listas")}>Volver a Listas</Button>
          </Card>}
      </main>
    </div>;
};
export default ComprarLista;