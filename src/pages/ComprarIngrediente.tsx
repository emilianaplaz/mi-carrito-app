import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Store, TrendingDown, Sparkles, Loader2 } from "lucide-react";

type Brand = {
  id: string;
  name: string;
};

type PriceInfo = {
  id: string;
  price: number;
  unit: string;
  supermarket_id: string;
  supermarket_name: string;
  brand_id: string;
  brand_name: string;
};

const ComprarIngrediente = () => {
  const [searchParams] = useSearchParams();
  const productName = searchParams.get("producto") || "";
  const listId = searchParams.get("lista") || "";
  
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [prices, setPrices] = useState<PriceInfo[]>([]);
  const [recommendation, setRecommendation] = useState<string>("");
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadBrandsAndPrices();
  }, [productName]);

  useEffect(() => {
    if (selectedBrand && prices.length > 0) {
      loadRecommendation();
    }
  }, [selectedBrand, prices]);

  const loadBrandsAndPrices = async () => {
    try {
      // Load all brands
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .order("name");

      if (brandsError) throw brandsError;
      setBrands(brandsData || []);

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
          brand_id,
          products (name),
          supermarkets (name),
          brands (name)
        `)
        .eq("product_id", productData.id);

      if (pricesError) throw pricesError;

      const formattedPrices: PriceInfo[] = (pricesData || []).map((p: any) => ({
        id: p.id,
        price: parseFloat(p.price),
        unit: p.unit,
        supermarket_id: p.supermarket_id,
        supermarket_name: p.supermarkets?.name || "Desconocido",
        brand_id: p.brand_id,
        brand_name: p.brands?.name || "Desconocida",
      }));

      setPrices(formattedPrices);

      // Auto-select first brand if available
      if (formattedPrices.length > 0) {
        setSelectedBrand(formattedPrices[0].brand_id);
      }
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

  const loadRecommendation = async () => {
    if (!selectedBrand) return;

    setLoadingRecommendation(true);
    try {
      const filteredPrices = prices.filter(p => p.brand_id === selectedBrand);
      
      const { data, error } = await supabase.functions.invoke('product-recommendations', {
        body: {
          productName,
          brandId: selectedBrand,
          prices: filteredPrices,
        }
      });

      if (error) throw error;
      setRecommendation(data.recommendation);
    } catch (error: any) {
      console.error("Error loading recommendation:", error);
      toast({
        title: "Error",
        description: "No se pudo obtener la recomendación",
        variant: "destructive",
      });
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const filteredPrices = selectedBrand
    ? prices.filter(p => p.brand_id === selectedBrand).sort((a, b) => a.price - b.price)
    : [];

  const cheapestPrice = filteredPrices.length > 0 ? filteredPrices[0].price : 0;

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
        {/* Brand Selection */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Selecciona la Marca</h2>
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue placeholder="Elige una marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* AI Recommendation */}
        {selectedBrand && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="flex items-start gap-3 mb-3">
              <Sparkles className="h-6 w-6 text-primary mt-1" />
              <h2 className="text-xl font-semibold">Recomendación Inteligente</h2>
            </div>
            {loadingRecommendation ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analizando precios...</span>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">{recommendation}</p>
            )}
          </Card>
        )}

        {/* Price Comparison */}
        {filteredPrices.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Comparación de Precios</h2>
              {filteredPrices.length > 1 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <TrendingDown className="h-4 w-4" />
                  <span>
                    Ahorra hasta €{(filteredPrices[filteredPrices.length - 1].price - cheapestPrice).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {filteredPrices.map((price, index) => (
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
        ) : selectedBrand ? (
          <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay precios disponibles</h3>
            <p className="text-muted-foreground">
              No se encontraron precios para esta marca del producto seleccionado
            </p>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Selecciona una marca</h3>
            <p className="text-muted-foreground">
              Elige una marca para ver los precios disponibles
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ComprarIngrediente;