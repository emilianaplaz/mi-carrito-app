import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Store, TrendingDown, Truck } from "lucide-react";

type PriceInfo = {
  id: string;
  price: number;
  unit: string;
  supermarket_id: string;
  supermarket_name: string;
  brand_name: string;
};

const ComprarIngrediente = () => {
  const [searchParams] = useSearchParams();
  const productName = searchParams.get("producto") || "";
  const listId = searchParams.get("lista") || "";
  
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<PriceInfo[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadBrandsAndPrices();
  }, [productName]);

  const loadBrandsAndPrices = async () => {
    try {
      // Load prices for this product
      // First get the product ID
      const { data: productData } = await supabase
        .from("products")
        .select("id, name")
        .eq("name", productName)
        .maybeSingle();

      if (!productData) {
        setPrices([]);
        setLoading(false);
        return;
      }

      const { data: pricesData, error: pricesError } = await supabase
        .from("product_prices")
        .select(`
          id,
          price,
          unit,
          supermarket_id,
          brand_name,
          products (name),
          supermarkets (name)
        `)
        .eq("product_id", productData.id);

      if (pricesError) throw pricesError;

      const formattedPrices: PriceInfo[] = (pricesData || []).map((p: any) => ({
        id: p.id,
        price: parseFloat(p.price),
        unit: p.unit,
        supermarket_id: p.supermarket_id,
        supermarket_name: p.supermarkets?.name || "Desconocido",
        brand_name: p.brand_name || "Desconocida",
      }));

      setPrices(formattedPrices);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Sort all prices by cheapest first
  const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
  const cheapestPrice = sortedPrices.length > 0 ? sortedPrices[0].price : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/listas`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Comprar: {productName}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Price Info Banner */}
        {sortedPrices.length > 0 && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400 mt-1" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Precios Disponibles</h2>
                <p className="text-sm text-foreground">
                  Mostrando todos los precios disponibles ordenados de menor a mayor para que encuentres la mejor opción.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Delivery Option */}
        {sortedPrices.length > 0 && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Truck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold text-lg">¿Necesitas Delivery?</h3>
                  <p className="text-sm text-muted-foreground">
                    Recibe tus productos en Caracas en 1-3 horas
                  </p>
                </div>
              </div>
              <Button 
                size="lg"
                className="rounded-full"
                onClick={() => navigate("/delivery-order")}
              >
                <Truck className="mr-2 h-5 w-5" />
                Comprar por Delivery
              </Button>
            </div>
          </Card>
        )}

        {/* Price Comparison */}
        {sortedPrices.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Comparación de Precios</h2>
              {sortedPrices.length > 1 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <TrendingDown className="h-4 w-4" />
                  <span>
                    Ahorra hasta €{(sortedPrices[sortedPrices.length - 1].price - cheapestPrice).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {sortedPrices.map((price, index) => (
              <Card
                key={price.id}
                className={`p-4 transition-all ${
                  index === 0
                    ? "border-2 border-green-500 shadow-lg"
                    : "hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Store className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">{price.supermarket_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Marca: {price.brand_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      €{price.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">por {price.unit}</p>
                    {index === 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                        ¡Mejor Precio!
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay precios disponibles</h3>
            <p className="text-muted-foreground">
              No se encontraron precios para este producto
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ComprarIngrediente;