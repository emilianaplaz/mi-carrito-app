import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChefHat, ArrowLeft, Store, TrendingDown, Truck } from "lucide-react";
type PriceInfo = {
  id: string;
  price: number;
  presentacion: string;
  mercado: string;
  marca: string;
};
const ComprarIngrediente = () => {
  const [searchParams] = useSearchParams();
  const productName = searchParams.get("producto") || "";
  const listId = searchParams.get("lista") || "";
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<PriceInfo[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadBrandsAndPrices();
  }, [productName]);
  const loadBrandsAndPrices = async () => {
    try {
      // Load prices for this product by producto (exact match, then fallback to partial)
      const { data: exactData, error: exactError } = await supabase
        .from("product_prices")
        .select(`
          id,
          precio,
          presentacion,
          mercado,
          marca,
          producto
        `)
        .eq("producto", productName);

      if (exactError) throw exactError;

      let pricesData = exactData;
      if (!pricesData || pricesData.length === 0) {
        const { data: likeData, error: likeError } = await supabase
          .from("product_prices")
          .select(`
            id,
            precio,
            presentacion,
            mercado,
            marca,
            producto
          `)
          .ilike("producto", `%${productName}%`);
        if (likeError) throw likeError;
        pricesData = likeData || [];
      }

      const formattedPrices: PriceInfo[] = (pricesData || []).map((p: any) => ({
        id: p.id,
        price: parseFloat(p.precio),
        presentacion: p.presentacion,
        mercado: p.mercado || "Desconocido",
        marca: p.marca || "Desconocida",
      }));
      setPrices(formattedPrices);

      // Extract unique brands from prices
      const brands = Array.from(new Set(formattedPrices.map(p => p.marca))).sort();
      setAvailableBrands(brands);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort prices
  const filteredPrices = selectedBrand === "ALL" ? [...prices].sort((a, b) => a.price - b.price) : prices.filter(p => p.marca === selectedBrand).sort((a, b) => a.price - b.price);
  const cheapestPrice = filteredPrices.length > 0 ? filteredPrices[0].price : 0;
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
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
        {/* Brand Filter */}
        {availableBrands.length > 0 && <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Filtrar por Marca</h2>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las Marcas</SelectItem>
                {availableBrands.map(brand => <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </Card>}

        {/* Price Info Banner */}
        {filteredPrices.length > 0}

        {/* Delivery Option */}
        {filteredPrices.length > 0 && <Card className="p-6 mb-6 bg-accent border-2 border-accent">
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
              <Button size="lg" className="rounded-full" onClick={() => navigate("/delivery-order")}>
                <Truck className="mr-2 h-5 w-5" />
                Comprar por Delivery
              </Button>
            </div>
          </Card>}

        {/* Price Comparison */}
        {filteredPrices.length > 0 ? <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Comparación de Precios</h2>
              {filteredPrices.length > 1 && <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <TrendingDown className="h-4 w-4" />
                  <span>
                    Ahorra hasta €{(filteredPrices[filteredPrices.length - 1].price - cheapestPrice).toFixed(2)}
                  </span>
                </div>}
            </div>

            {filteredPrices.map((price, index) => <Card key={price.id} className={`p-4 transition-all ${index === 0 ? "border-2 border-green-500 shadow-lg" : "hover:shadow-md"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Store className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">{price.mercado}</h3>
                      <p className="text-sm text-muted-foreground">
                        Marca: {price.marca}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      €{price.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">por {price.presentacion}</p>
                    {index === 0 && <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                        ¡Mejor Precio!
                      </p>}
                  </div>
                </div>
              </Card>)}
          </div> : <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay precios disponibles</h3>
            <p className="text-muted-foreground">
              No se encontraron precios para este producto
            </p>
          </Card>}
      </main>
    </div>;
};
export default ComprarIngrediente;