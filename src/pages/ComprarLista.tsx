import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Store, Sparkles, Loader2, ShoppingCart, AlertCircle, X, Clock, Calendar as CalendarIcon, ToggleLeft, ToggleRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CartButton } from "@/components/Cart";
import logo from "@/assets/mi-carrit-logo.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { es } from "date-fns/locale";
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
  is_automated?: boolean;
  automation_frequency?: string;
  next_scheduled_date?: string;
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
  displayLabel?: string;
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
  const [userBudget, setUserBudget] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showMissingAlert, setShowMissingAlert] = useState(true);
  const [isAutomated, setIsAutomated] = useState(false);
  const [automationFrequency, setAutomationFrequency] = useState<string>("weekly");
  const [nextScheduledDate, setNextScheduledDate] = useState<Date | undefined>(undefined);
  const [showAutomationSettings, setShowAutomationSettings] = useState(false);
  
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
      
      // Load user budget preference
      const { data: prefsData } = await supabase
        .from("user_preferences")
        .select("budget")
        .eq("user_id", session.user.id)
        .maybeSingle();
      
      if (prefsData?.budget) {
        setUserBudget(prefsData.budget);
      }
      
      const {
        data,
        error
      } = await supabase.from("grocery_lists").select("*").eq("id", listId).eq("user_id", session.user.id).single();
      if (error) throw error;
      const formattedList: GroceryList = {
        ...data,
        items: Array.isArray(data.items) ? data.items as GroceryItem[] : [],
        is_automated: data.is_automated,
        automation_frequency: data.automation_frequency,
        next_scheduled_date: data.next_scheduled_date
      };

      // Set automation state
      if (formattedList.is_automated) {
        setIsAutomated(true);
        setAutomationFrequency(formattedList.automation_frequency || "weekly");
        if (formattedList.next_scheduled_date) {
          setNextScheduledDate(new Date(formattedList.next_scheduled_date));
        }
      }

      // Initialize brand preferences from list items
      const initialPreferences: Record<string, string> = {};
      formattedList.items.forEach(item => {
        initialPreferences[item.name] = item.brand || "ANY";
      });
      setItemBrandPreferences(initialPreferences);
      setList(formattedList);
      await loadRecommendations(formattedList, prefsData?.budget);
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
  const loadRecommendations = async (groceryList: GroceryList, budget?: number) => {
    setLoadingRecommendations(true);
    try {
      // Apply brand preferences to items
      const itemsWithPreferences = groceryList.items.map(item => ({
        ...item,
        brand: itemBrandPreferences[item.name] === "ANY" ? undefined : itemBrandPreferences[item.name]
      }));

      // Fetch ALL product prices to do fuzzy matching (paginate to get full table)
      const PAGE_SIZE = 1000;
      const allPricesData: any[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("product_prices")
          .select(`
            precio,
            presentacion,
            marca,
            producto,
            mercado
          `)
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (data && data.length > 0) allPricesData.push(...data);
        if (!data || data.length < PAGE_SIZE) break;
      }

      // Import shared fuzzy matching utilities
      const { fuzzyMatch } = await import("@/lib/fuzzyMatch");

      // Build matched prices and REMAP product name to the corresponding list item name
      const matchedPrices = [] as any[];
      for (const price of allPricesData || []) {
        const matchedItem = groceryList.items.find(item => fuzzyMatch(item.name, price.producto));
        if (matchedItem) {
          matchedPrices.push({ ...price, producto: matchedItem.name });
        }
      }

      console.log('🔍 Fuzzy Matching Debug:');
      console.log('List items:', groceryList.items.map(i => i.name));
      console.log('Sample productos from DB:', (allPricesData || []).slice(0, 10).map((p: any) => p.producto));
      console.log('Matched prices count:', matchedPrices.length);
      console.log('Total prices count:', (allPricesData || []).length);

      // Show specific matching details for common items
      ['Platano', 'manzana', 'tomate', 'cebolla', 'ajo'].forEach(itemName => {
        const matches = (allPricesData || []).filter((p: any) => fuzzyMatch(itemName, p.producto));
        console.log(`"${itemName}" matches:`, matches.length, matches.slice(0, 3).map((p: any) => p.producto));
      });

      // Fetch ALL supermarkets to show complete breakdown
      const {
        data: allSupermarkets
      } = await supabase.from("supermarkets").select("name").order("name");
      const { data, error } = await supabase.functions.invoke('list-recommendations', {
        body: {
          listName: groceryList.name,
          items: itemsWithPreferences,
          availablePrices: matchedPrices || [],
          allSupermarkets: (allSupermarkets || []).map((s: any) => s.name),
          budget: budget || userBudget
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
  
  const toggleCard = () => {
    setIsOpen(!isOpen);
  };
  
  const handleBrandChange = (itemName: string, brand: string) => {
    setItemBrandPreferences(prev => ({
      ...prev,
      [itemName]: brand
    }));
  };
  const handleRefreshRecommendations = () => {
    if (list) {
      loadRecommendations(list, userBudget || undefined);
    }
  };

  const calculateNextDate = (frequency: string, fromDate?: Date): Date => {
    const startDate = fromDate || new Date();
    switch (frequency) {
      case "weekly":
        return addWeeks(startDate, 1);
      case "bi-weekly":
        return addWeeks(startDate, 2);
      case "monthly":
        return addMonths(startDate, 1);
      default:
        return addWeeks(startDate, 1);
    }
  };

  const handleSaveAutomation = async () => {
    if (!list) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const nextDate = isAutomated
        ? (nextScheduledDate || calculateNextDate(automationFrequency))
        : null;

      const { error } = await supabase
        .from("grocery_lists")
        .update({
          is_automated: isAutomated,
          automation_frequency: isAutomated ? automationFrequency : null,
          next_scheduled_date: nextDate ? nextDate.toISOString() : null,
        })
        .eq("id", list.id);

      if (error) throw error;

      toast({
        title: isAutomated ? "Automatización activada" : "Automatización desactivada",
        description: isAutomated
          ? `Tu lista se agregará automáticamente cada ${
              automationFrequency === "weekly"
                ? "semana"
                : automationFrequency === "bi-weekly"
                ? "2 semanas"
                : "mes"
            }`
          : "La automatización ha sido desactivada",
      });

      setShowAutomationSettings(false);
    } catch (error: any) {
      console.error("Error saving automation:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
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
          <div className="flex items-center justify-center">
            <img src={logo} alt="MiCarrit" className="h-28" />
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
              <Calendar className="h-10 w-10" />
            </Button>
            <CartButton />
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ChefHat className="h-10 w-10" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Missing Items Alert */}
        {itemsWithoutPrices.length > 0 && showMissingAlert && (
          <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
              onClick={() => setShowMissingAlert(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="flex-1 pr-8">
              <AlertTitle className="text-orange-800 dark:text-orange-300 font-bold">
                {itemsWithoutPrices.length} producto(s) no encontrado(s)
              </AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-400">
                Los siguientes productos no están disponibles en ningún supermercado: {itemsWithoutPrices.map(item => item.name).join(', ')}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Brand Selection Section */}
  <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold cursor-pointer" onClick={toggleCard}>
            Preferencias de Marca
          </h2>
          {userBudget && (
            <p className="text-sm text-muted-foreground mt-1">
              Presupuesto: <span className="font-semibold text-primary">${userBudget.toFixed(2)}</span>
            </p>
          )}
        </div>
        <button onClick={toggleCard}>
          {isOpen ? 'Collapse' : 'Expand'} {/* Button to toggle the card */}
        </button>
      </div>
      {isOpen && ( // Conditionally render content based on isOpen
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Selecciona "ANY" para buscar el mejor precio entre todas las marcas, o elige una marca específica
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list?.items.map((item, index) => {
              const availableBrands = allPrices.find(p => p.name.toLowerCase() === item.name.toLowerCase())?.availablePrices.map(p => p.brand).filter((brand, idx, arr) => brand && arr.indexOf(brand) === idx) || [];
              return (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
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
                      {availableBrands.map(brand => (
                        <SelectItem key={brand} value={brand || "sin marca"}>
                          {brand || "Sin marca"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>

        {/* Automation Settings Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">Automatización de Lista</h2>
                <p className="text-sm text-muted-foreground">
                  Programa esta lista para agregarla automáticamente al carrito
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={isAutomated}
                onCheckedChange={(checked) => {
                  setIsAutomated(checked);
                  setShowAutomationSettings(checked);
                }}
              />
              <Label htmlFor="automation-toggle">
                {isAutomated ? "Activado" : "Desactivado"}
              </Label>
            </div>
          </div>

          {showAutomationSettings && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select value={automationFrequency} onValueChange={setAutomationFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="bi-weekly">Quincenal (cada 2 semanas)</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="buy_once">Una Vez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Primera fecha programada</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {nextScheduledDate ? (
                          format(nextScheduledDate, "PPP", { locale: es })
                        ) : (
                          <span>Selecciona una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={nextScheduledDate}
                        onSelect={setNextScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {isAutomated && nextScheduledDate ? (
                    <>
                      Esta lista se agregará automáticamente al carrito el{" "}
                      <strong>{format(nextScheduledDate, "PPP", { locale: es })}</strong> y luego cada{" "}
                      {automationFrequency === "weekly"
                        ? "semana"
                        : automationFrequency === "bi-weekly"
                        ? "2 semanas"
                        : "mes"}
                    </>
                  ) : (
                    "Selecciona una fecha y frecuencia para activar"
                  )}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAutomationSettings(false);
                    setIsAutomated(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveAutomation} disabled={!nextScheduledDate}>
                  Guardar Automatización
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/calendar")}
                  className="flex items-center gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Ver Calendario
                </Button>
              </div>
            </div>
          )}

          {isAutomated && !showAutomationSettings && nextScheduledDate && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      Próxima programación:{" "}
                      {format(nextScheduledDate, "PPP", { locale: es })}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Frecuencia:{" "}
                      {automationFrequency === "weekly"
                        ? "Semanal"
                        : automationFrequency === "bi-weekly"
                        ? "Quincenal"
                        : "Mensual"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAutomationSettings(true)}
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Loading state */}
        {loadingRecommendations ? <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analizando mejores opciones de compra...</span>
            </div>
          </Card> : <>
            {/* AI Smart Recommendations - Show Both Options */}
            {aiSummary && recommendations.length > 0 && (
              <div className="space-y-4 mb-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-bold">Opciones de Compra</h2>
                  <p className="text-sm text-muted-foreground">Elige la estrategia que prefieras</p>
                </div>
                
                {/* Always show in order: Best Option first, then Cheapest */}
                {recommendations
                  .slice(0, 2)
                  .map((rec, index) => {
                  // Use the backend's displayLabel for accurate labeling
                  const displayTitle = rec.displayLabel === 'Mejor Opción' 
                    ? '🎯 Mejor Opción' 
                    : '💰 Opción Más Barata';
                  
                  return (
                    <Card key={index} className={`p-6 border-2 ${(rec.missingCount || 0) === 0 ? 'bg-card border-primary' : 'bg-card border-accent'}`}>
                      <div className="flex items-start gap-3 mb-4">
                        <Sparkles className={`h-7 w-7 mt-1 flex-shrink-0 ${(rec.missingCount || 0) === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold mb-2 ${(rec.missingCount || 0) === 0 ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
                            {displayTitle}
                          </h3>
                          
                          {/* Recommendation details */}
                          <div className={`rounded-lg p-4 border ${(rec.missingCount || 0) === 0 ? 'bg-card border-primary' : 'bg-card border-accent'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Store className={`h-8 w-8 ${(rec.missingCount || 0) === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`} />
                                <div>
                                  <h4 className="font-bold text-lg">{rec.supermarket}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {rec.items.length} de {list.items.length} artículos
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-3xl font-bold ${(rec.missingCount || 0) === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                  ${rec.totalPrice.toFixed(2)}
                                </p>
                                <p className={`text-xs font-semibold ${(rec.missingCount || 0) === 0 ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`}>
                                  {(rec.missingCount || 0) === 0 ? '¡Cobertura Total!' : 'Cobertura Parcial'}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground italic mb-4">{rec.reasoning}</p>
                            <Button className="w-full" size="lg" onClick={() => handleAddToCart(rec.supermarket, rec.items)}>
                              <ShoppingCart className="mr-2 h-5 w-5" />
                              Agregar Todo al Carrito
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

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

              // Add missing items - for each supermarket, check which items from the original list are missing
              list.items.forEach(listItem => {
                supermarketMap.forEach((data, supermarket) => {
                  const hasItem = data.available.some((a: any) => a.name.toLowerCase() === listItem.name.toLowerCase());
                  if (!hasItem) {
                    // This item from the list is not available at this supermarket
                    data.missing.push(listItem.name);
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
                            <p className="text-2xl font-bold text-primary">${data.total.toFixed(2)}</p>
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
                            {data.available.map((prod: any, idx: number) => <div 
                                key={idx} 
                                className="flex items-center justify-between text-sm p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                onClick={() => {
                                  addItem({
                                    name: prod.name,
                                    brand: prod.brand,
                                    quantity: 1,
                                    price: prod.price,
                                    unit: prod.unit || "unidad",
                                    supermarket
                                  });
                                  toast({
                                    title: "¡Agregado!",
                                    description: `${prod.name} agregado al carrito`
                                  });
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="font-medium">{prod.name}</span>
                                  {prod.brand && <span className="text-xs text-muted-foreground">({prod.brand})</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-green-700 dark:text-green-400">${prod.price.toFixed(2)}</span>
                                  <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                                </div>
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
                  {itemsWithoutPrices.map((item, index) => <div key={index} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-card border border-destructive">
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
    </div>
  );
};
export default ComprarLista;