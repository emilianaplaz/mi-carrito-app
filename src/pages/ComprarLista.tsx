import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Store, Sparkles, Loader2, ShoppingCart } from "lucide-react";

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
};

const ComprarLista = () => {
  const [searchParams] = useSearchParams();
  const listId = searchParams.get("id") || "";
  
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<GroceryList | null>(null);
  const [recommendations, setRecommendations] = useState<SupermarketRecommendation[]>([]);
  const [allPrices, setAllPrices] = useState<ItemPriceComparison[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadList();
  }, [listId]);

  const loadList = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("grocery_lists")
        .select("*")
        .eq("id", listId)
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      const formattedList: GroceryList = {
        ...data,
        items: Array.isArray(data.items) ? data.items as GroceryItem[] : []
      };

      setList(formattedList);
      await loadRecommendations(formattedList);
    } catch (error: any) {
      console.error("Error loading list:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la lista",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async (groceryList: GroceryList) => {
    setLoadingRecommendations(true);
    try {
      const itemNames = groceryList.items.map(item => item.name);

      // Step 1: Try exact match on product names
      const { data: productDataExact } = await supabase
        .from("products")
        .select("id, name")
        .in("name", itemNames);

      const exactNames = new Set((productDataExact || []).map(p => p.name));

      // Step 2: Fuzzy map missing items to closest product names
      let nameMap: Record<string, string> = {};
      if ((productDataExact?.length || 0) < itemNames.length) {
        const { data: allProducts } = await supabase
          .from("products")
          .select("id, name");

        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
        const productByName = new Map((allProducts || []).map(p => [p.name, p]));
        const allNames = (allProducts || []).map(p => p.name);

        for (const name of itemNames) {
          if (exactNames.has(name)) continue;
          const n = norm(name);
          const exact = allNames.find(an => norm(an) === n);
          const fuzzy = exact || allNames.find(an => norm(an).includes(n) || n.includes(norm(an)));
          if (fuzzy) nameMap[name] = fuzzy;
        }
      }

      // Collect final product ids to fetch prices
      const finalNames = Array.from(new Set([...(productDataExact?.map(p => p.name) || []), ...Object.values(nameMap)]));
      const { data: finalProducts } = finalNames.length > 0
        ? await supabase.from("products").select("id, name").in("name", finalNames)
        : { data: [] as any[] } as any;

      const productIds = (finalProducts || []).map(p => p.id);

      const { data: pricesData, error: pricesError } = await supabase
        .from("product_prices")
        .select(`
          price,
          unit,
          products (name),
          supermarkets (name),
          brands (name)
        `)
        .in("product_id", productIds);

      if (pricesError) throw pricesError;

      // Prepare items for AI: use mapped names when available
      const itemsForAI = groceryList.items.map(it => ({ ...it, name: nameMap[it.name] || it.name }));

      const { data, error } = await supabase.functions.invoke('list-recommendations', {
        body: {
          listName: groceryList.name,
          items: itemsForAI,
          availablePrices: pricesData || [],
        }
      });

      if (error) throw error;
      
      setRecommendations(data.recommendations || []);
      setAllPrices(data.allPrices || []);
      setAiSummary(data.summary || "");
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las recomendaciones",
        variant: "destructive",
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Lista no encontrada</h2>
          <Button onClick={() => navigate("/listas")}>Volver a Listas</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/listas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Comprar: {list.name}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* List Items Summary */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Artículos en tu lista</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {list.items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.amount && item.unit && (
                    <span className="text-primary font-semibold">
                      {item.amount} {item.unit}
                    </span>
                  )}
                </div>
                {item.brand && <span className="text-muted-foreground">({item.brand})</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* AI Summary */}
        {loadingRecommendations ? (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analizando mejores opciones de compra...</span>
            </div>
          </Card>
        ) : aiSummary ? (
          <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex items-start gap-3 mb-3">
              <Sparkles className="h-6 w-6 text-primary mt-1" />
              <h2 className="text-xl font-semibold">Recomendación Inteligente</h2>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{aiSummary}</p>
          </Card>
        ) : null}

        {/* Supermarket Recommendations */}
        {recommendations.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Plan de Compra Recomendado</h2>
            {recommendations.map((rec, index) => (
              <Card
                key={index}
                className={`p-6 transition-all ${
                  index === 0
                    ? "border-2 border-green-500 shadow-lg"
                    : "hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Store className="h-10 w-10 text-primary" />
                    <div>
                      <h3 className="font-semibold text-xl">{rec.supermarket}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          {rec.items.length} {rec.items.length === 1 ? "artículo" : "artículos"}
                        </p>
                        {rec.isCombination && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Combinación
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      €{rec.totalPrice.toFixed(2)}
                    </p>
                    {index === 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                        ¡Mejor Opción!
                      </p>
                    )}
                  </div>
                </div>

                {/* Items to buy at this supermarket */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Artículos y precios:</p>
                  <div className="space-y-2">
                    {rec.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          <div>
                            <span className="font-medium">{item.item}</span>
                            {item.brand && <span className="text-muted-foreground ml-1">({item.brand})</span>}
                            {item.supermarket && rec.isCombination && (
                              <span className="text-xs ml-2 text-primary">en {item.supermarket}</span>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold text-primary">€{item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reasoning */}
                {rec.reasoning && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : !loadingRecommendations ? (
          <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay recomendaciones disponibles</h3>
            <p className="text-muted-foreground mb-4">
              No se encontraron precios suficientes para los artículos de tu lista
            </p>
            <Button onClick={() => navigate("/listas")}>Volver a Listas</Button>
          </Card>
        ) : null}
      </main>
    </div>
  );
};

export default ComprarLista;
