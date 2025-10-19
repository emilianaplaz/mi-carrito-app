import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  ArrowLeft,
  Settings,
  Coffee,
  UtensilsCrossed,
  Moon,
  ThumbsUp,
  ThumbsDown,
  ShoppingCart,
  Clock,
  Users,
  ListPlus,
  CheckSquare,
  X,
  Sparkles,
  Calendar,
} from "lucide-react";
import logo from "@/assets/mi-carrit-logo.png";
import loadingCart from "@/assets/loading-cart.png";
import { CartButton } from "@/components/Cart";

type Recipe = {
  id: string;
  name: string;
  description: string;
  ingredients: any[];
  instructions: any[];
  prep_time: number;
  cook_time: number;
  servings: number;
  cuisine_type: string;
  dietary_tags: string[];
  meal_type: string;
};

type RecipePreference = {
  recipe_id: string;
  is_liked: boolean;
};

const MiPlan = () => {
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [preferences, setPreferences] = useState<any>(null);
  const [recipePrefs, setRecipePrefs] = useState<Record<string, boolean>>({});
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddToList, setShowAddToList] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [listName, setListName] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [existingLists, setExistingLists] = useState<any[]>([]);
  const [listChoice, setListChoice] = useState<"new" | "existing">("new");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadExistingLists();
  }, [navigate]);

  const loadExistingLists = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("grocery_lists")
      .select("id, name")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setExistingLists(data);
    }
  };

  const loadData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Load meal plan
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (plan && plan.recipe_ids) {
      setPlanStartDate(new Date(plan.created_at));
      const recipeIdsData = typeof plan.recipe_ids === "object" && plan.recipe_ids !== null ? plan.recipe_ids : null;

      if (recipeIdsData) {
        setMealPlan(recipeIdsData);

        // Collect all recipe IDs
        const allRecipeIds = new Set<string>();
        const days = (recipeIdsData as any).days || [];
        for (const day of days) {
          [...(day.breakfast || []), ...(day.lunch || []), ...(day.dinner || [])].forEach((id) => allRecipeIds.add(id));
        }

        // Load all recipes
        const { data: recipesData } = await supabase.from("recipes").select("*").in("id", Array.from(allRecipeIds));

        if (recipesData) {
          const recipesMap: Record<string, Recipe> = {};
          recipesData.forEach((r) => {
            recipesMap[r.id] = {
              ...r,
              ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
              instructions: Array.isArray(r.instructions) ? r.instructions : [],
            } as Recipe;
          });
          setRecipes(recipesMap);
        }

        // Load user recipe preferences
        const { data: prefsData } = await supabase
          .from("user_recipe_preferences")
          .select("recipe_id, is_liked")
          .eq("user_id", session.user.id);

        if (prefsData) {
          const prefsMap: Record<string, boolean> = {};
          prefsData.forEach((p: RecipePreference) => {
            prefsMap[p.recipe_id] = p.is_liked;
          });
          setRecipePrefs(prefsMap);
        }
      }
    }

    // Load preferences
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    setPreferences(prefs);
    setLoading(false);
  };

  const handleRecipePreference = async (recipeId: string, isLiked: boolean) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("user_recipe_preferences").upsert({
      user_id: session.user.id,
      recipe_id: recipeId,
      is_liked: isLiked,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la preferencia",
        variant: "destructive",
      });
    } else {
      setRecipePrefs({ ...recipePrefs, [recipeId]: isLiked });
      toast({
        title: isLiked ? "¡Te gusta esta receta!" : "Receta marcada",
        description: isLiked ? "Guardada en tus recetas" : "No se recomendará en el futuro",
      });
    }
  };

  const normalizeIngredientName = (name: string): string => {
    const synonyms: Record<string, string> = {
      "frutas del bosque": "berries",
      "frutos del bosque": "berries",
      "frutos rojos": "berries",
      bayas: "berries",
      tomate: "tomate",
      jitomate: "tomate",
      papas: "patatas",
      patata: "patatas",
      papa: "patatas",
      ají: "pimiento",
      chile: "pimiento",
      pimentón: "pimiento",
      cebolleta: "cebolla",
      cebollín: "cebolla",
      zanahoria: "zanahoria",
      azúcar: "azúcar",
      azucar: "azúcar",
    };

    const lowerName = name.toLowerCase().trim();
    return synonyms[lowerName] || lowerName;
  };

  const roundToBuyableAmount = (amount: number, unit: string, availableSizes: number[]): number => {
    if (availableSizes.length === 0) return amount;

    // Normalize unit to match database
    const normalizedUnit = unit.toLowerCase().trim();

    // Find smallest package that fits the need
    const sorted = [...availableSizes].sort((a, b) => a - b);
    const suitable = sorted.find((size) => size >= amount);

    return suitable || sorted[sorted.length - 1]; // Return biggest if none fit
  };

  const parseUnit = (unitStr: string): { value: number; unit: string } => {
    // Handle units like "1kg", "500g", "250ml"
    const match = unitStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
    if (match) {
      return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
    }
    return { value: 0, unit: unitStr.toLowerCase() };
  };

  const combineItems = async (items: any[]): Promise<any[]> => {
    const excludedItems = [
      "agua",
      "sal",
      "pimienta",
      "pimienta negra",
      "aceite de oliva",
      "aceite de oliva virgen extra",
    ];
    const itemMap = new Map<string, any>();

    // Fetch available product sizes from database
    const { data: productsData } = await supabase.from("products").select("id, name");

    const { data: pricesData } = await supabase.from("product_prices").select("producto, presentacion");

    // Build map of product name -> available sizes per unit type
    const productSizes = new Map<string, Map<string, number[]>>();

    if (productsData && pricesData) {
      pricesData.forEach((price: any) => {
        const productName = price.producto?.toLowerCase();
        if (!productName) return;

        const parsed = parseUnit(price.presentacion);
        if (parsed.value === 0) return;

        if (!productSizes.has(productName)) {
          productSizes.set(productName, new Map());
        }

        const unitMap = productSizes.get(productName)!;
        if (!unitMap.has(parsed.unit)) {
          unitMap.set(parsed.unit, []);
        }
        unitMap.get(parsed.unit)!.push(parsed.value);
      });
    }

    items.forEach((item) => {
      const originalName = item.item || item.name;
      if (!originalName) return;

      const lowerName = originalName.toLowerCase().trim();
      // Skip excluded items
      if (excludedItems.some((excluded) => lowerName.includes(excluded))) {
        return;
      }

      const normalizedKey = normalizeIngredientName(originalName);

      if (itemMap.has(normalizedKey)) {
        const existing = itemMap.get(normalizedKey);
        // Only combine if units match
        const itemUnit = (item.unit || "unidad").toLowerCase();
        const existingUnit = (existing.unit || "unidad").toLowerCase();

        if (itemUnit === existingUnit) {
          const existingAmount = parseFloat(existing.amount) || 0;
          const newAmount = parseFloat(item.amount) || 0;
          existing.amount = String(existingAmount + newAmount);
        } else {
          // Different units, create a new entry with a modified key
          const newKey = `${normalizedKey}_${itemUnit}`;
          itemMap.set(newKey, {
            name: originalName,
            brand: item.brand || "",
            amount: item.amount || "1",
            unit: item.unit || "unidad",
          });
        }
      } else {
        itemMap.set(normalizedKey, {
          name: originalName,
          brand: item.brand || "",
          amount: item.amount || "1",
          unit: item.unit || "unidad",
        });
      }
    });

    // Round up amounts to buyable sizes
    const result: any[] = [];
    for (const item of itemMap.values()) {
      const normalizedProductName = normalizeIngredientName(item.name);
      const unit = (item.unit || "unidad").toLowerCase();
      const amount = parseFloat(item.amount) || 1;

      const availableSizesForUnit = productSizes.get(normalizedProductName)?.get(unit) || [];
      const buyableAmount =
        availableSizesForUnit.length > 0 ? roundToBuyableAmount(amount, unit, availableSizesForUnit) : amount;

      result.push({
        ...item,
        amount: String(buyableAmount),
      });
    }

    return result;
  };

  const handleAddToShoppingList = async () => {
    if (!selectedRecipe || selectedIngredients.size === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona ingredientes",
        variant: "destructive",
      });
      return;
    }

    if (listChoice === "new" && !listName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la lista",
        variant: "destructive",
      });
      return;
    }

    if (listChoice === "existing" && !selectedListId) {
      toast({
        title: "Error",
        description: "Por favor selecciona una lista existente",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const selectedItems = Array.from(selectedIngredients).map((idx) => ({
      name: selectedRecipe.ingredients[idx].item,
      brand: "",
      amount: selectedRecipe.ingredients[idx].amount,
      unit: selectedRecipe.ingredients[idx].unit,
    }));

    if (listChoice === "new") {
      const combinedItems = await combineItems(selectedItems);
      const { error } = await supabase.from("grocery_lists").insert({
        user_id: session.user.id,
        name: listName,
        items: combinedItems,
      });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la lista",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Add to existing list
      const { data: existingList } = await supabase
        .from("grocery_lists")
        .select("items")
        .eq("id", selectedListId)
        .single();

      if (existingList) {
        const currentItems = Array.isArray(existingList.items) ? existingList.items : [];
        const combinedItems = await combineItems([...currentItems, ...selectedItems]);
        const { error } = await supabase
          .from("grocery_lists")
          .update({ items: combinedItems })
          .eq("id", selectedListId);

        if (error) {
          toast({
            title: "Error",
            description: "No se pudo actualizar la lista",
            variant: "destructive",
          });
          return;
        }
      }
    }

    toast({
      title: "¡Ingredientes agregados!",
      description: listChoice === "new" ? "Lista creada exitosamente" : "Ingredientes agregados a la lista",
    });
    setShowAddToList(false);
    setSelectedIngredients(new Set());
    setListName("");
    setListChoice("new");
    setSelectedListId("");
    loadExistingLists();
  };

  const handleBulkAddToList = async () => {
    if (listChoice === "new" && !listName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la lista",
        variant: "destructive",
      });
      return;
    }

    if (listChoice === "existing" && !selectedListId) {
      toast({
        title: "Error",
        description: "Por favor selecciona una lista existente",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // Collect all ingredients from selected recipes
    // Important: This includes ingredients from recipes that are repeated in the week
    // The combineItems function will automatically:
    // 1. Exclude water, salt, pepper, and olive oil (pantry staples)
    // 2. Sum up quantities of the same ingredient across all recipes
    // 3. Normalize ingredient names to avoid duplicates
    const allIngredients: any[] = [];
    selectedRecipeIds.forEach((recipeId) => {
      const recipe = recipes[recipeId];
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach((ing) => {
          allIngredients.push({
            name: ing.item,
            brand: "",
            amount: ing.amount,
            unit: ing.unit,
          });
        });
      }
    });

    if (allIngredients.length === 0) {
      toast({
        title: "Error",
        description: "No hay ingredientes para agregar",
        variant: "destructive",
      });
      return;
    }

    if (listChoice === "new") {
      const combinedItems = await combineItems(allIngredients);
      const { error } = await supabase.from("grocery_lists").insert({
        user_id: session.user.id,
        name: listName,
        items: combinedItems,
      });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la lista",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { data: existingList } = await supabase
        .from("grocery_lists")
        .select("items")
        .eq("id", selectedListId)
        .single();

      if (existingList) {
        const currentItems = Array.isArray(existingList.items) ? existingList.items : [];
        const combinedItems = await combineItems([...currentItems, ...allIngredients]);
        const { error } = await supabase
          .from("grocery_lists")
          .update({ items: combinedItems })
          .eq("id", selectedListId);

        if (error) {
          toast({
            title: "Error",
            description: "No se pudo actualizar la lista",
            variant: "destructive",
          });
          return;
        }
      }
    }

    const combinedForCount = await combineItems(allIngredients);
    const uniqueCount = combinedForCount.length;
    toast({
      title: "¡Lista creada!",
      description: `${uniqueCount} ingredientes con cantidades totales para toda la semana`,
    });
    setShowBulkAddDialog(false);
    setSelectedRecipeIds(new Set());
    setSelectionMode(false);
    setListName("");
    setListChoice("new");
    setSelectedListId("");
    loadExistingLists();
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedRecipeIds(new Set());
  };


  const handleEditPreferences = () => {
    navigate("/editar-preferencias");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src={loadingCart} alt="Loading" className="w-32 h-auto object-contain animate-pulse" />
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold">Mi Plan</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <img src={logo} alt="MiCarrit" className="h-28" />
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
                <Calendar className="h-5 w-5" />
              </Button>
              <CartButton />
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ChefHat className="h-10 w-10" />
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">No tienes un plan todavía</h1>
            <p className="text-muted-foreground mb-6">
              Configura tus preferencias para generar tu plan personalizado
            </p>
            <Button onClick={() => navigate("/editar-preferencias")}>Crear Mi Plan</Button>
          </Card>
        </main>
      </div>
    );
  }

  const daysCount = mealPlan.days?.length || 0;

  const getDayDate = (dayNumber: number): string => {
    if (!planStartDate) return "";
    const date = new Date(planStartDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date.toLocaleDateString("es-VE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="hover:bg-primary/10 hover:text-primary transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <ChefHat className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Mi Plan de Comidas</h1>
                  <p className="text-xs text-muted-foreground">{daysCount} días de nutrición</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <img src={logo} alt="MiCarrit" className="h-28" />
            </div>

            <div className="flex items-center gap-4 flex-1 justify-end">
              {/* Plan Completo Button - Always visible on right */}
              {!selectionMode ? (
                <>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => {
                      const allRecipeIds = new Set<string>();
                      mealPlan.days?.forEach((day: any) => {
                        [...(day.breakfast || []), ...(day.lunch || []), ...(day.dinner || [])].forEach((id) => allRecipeIds.add(id));
                      });
                      setSelectedRecipeIds(allRecipeIds);
                      setSelectionMode(true);
                      setShowBulkAddDialog(true);
                    }}
                    className="group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ListPlus className="h-5 w-5 mr-2 relative z-10 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                      <div className="font-semibold">Plan Completo</div>
                      <div className="text-xs opacity-90">Agregar todo a lista</div>
                    </div>
                  </Button>
                  <CartButton />
                  <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                    <ChefHat className="h-10 w-10" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => setShowBulkAddDialog(true)}
                    disabled={selectedRecipeIds.size === 0}
                    className="group relative overflow-hidden disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ShoppingCart className="h-5 w-5 mr-2 relative z-10 group-hover:scale-110 transition-transform" />
                    <div className="relative z-10">
                      <div className="font-semibold">Crear Lista de Compras</div>
                      <div className="text-xs opacity-90">
                        {selectedRecipeIds.size === 0
                          ? "Selecciona recetas"
                          : `${selectedRecipeIds.size} receta${selectedRecipeIds.size > 1 ? "s" : ""} seleccionada${selectedRecipeIds.size > 1 ? "s" : ""}`}
                      </div>
                    </div>
                    {selectedRecipeIds.size > 0 && (
                      <Badge className="ml-2 relative z-10 bg-white text-primary">{selectedRecipeIds.size}</Badge>
                    )}
                  </Button>
                  <CartButton />
                  <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                    <ChefHat className="h-10 w-10" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Action Buttons Below Header */}
      <div className="px-10">
        <div className="container mx-auto px-4 py-3">
          {!selectionMode ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setSelectionMode(true)}
                className="flex-1 group hover:bg-primary/10 hover:border-primary transition-all"
              >
                <CheckSquare className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold">Seleccionar Recetas</div>
                  <div className="text-xs text-muted-foreground">Elegir algunas recetas</div>
                </div>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleEditPreferences}
                className="flex-1 group hover:bg-accent/50 hover:border-accent transition-all"
              >
                <Settings className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                <div>
                  <div className="font-semibold">Editar Preferencias</div>
                  <div className="text-xs text-muted-foreground">Personalizar plan</div>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary border border-primary animate-fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-foreground animate-pulse" />
                  <span className="text-sm font-medium text-primary-foreground">
                    Modo de selección activado - Toca las recetas para seleccionarlas
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelSelection}
                  className="group hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <X className="h-4 w-4 mr-1 group-hover:rotate-90 transition-transform" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {mealPlan.days?.map((day: any) => (
            <Card key={day.day} className="p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Día {day.day}</h2>
                <p className="text-sm text-muted-foreground capitalize">{getDayDate(day.day)}</p>
              </div>

              <Tabs defaultValue="breakfast" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="breakfast">
                    <Coffee className="h-4 w-4 mr-2" />
                    Desayuno
                  </TabsTrigger>
                  <TabsTrigger value="lunch">
                    <UtensilsCrossed className="h-4 w-4 mr-2" />
                    Almuerzo
                  </TabsTrigger>
                  <TabsTrigger value="dinner">
                    <Moon className="h-4 w-4 mr-2" />
                    Cena
                  </TabsTrigger>
                </TabsList>

                {["breakfast", "lunch", "dinner"].map((mealType) => (
                  <TabsContent key={mealType} value={mealType} className="mt-4">
                    <div className="grid gap-3">
                      {(day[mealType] || []).map((recipeId: string, idx: number) => {
                        const recipe = recipes[recipeId];
                        if (!recipe) return null;
                        const isLiked = recipePrefs[recipeId];

                        return (
                          <Card
                            key={idx}
                            className={`p-4 transition-all cursor-pointer ${
                              selectionMode && selectedRecipeIds.has(recipeId)
                                ? "border-2 border-primary bg-primary"
                                : ""
                            }`}
                            onClick={() => {
                              if (selectionMode) {
                                const newSet = new Set(selectedRecipeIds);
                                if (newSet.has(recipeId)) {
                                  newSet.delete(recipeId);
                                } else {
                                  newSet.add(recipeId);
                                }
                                setSelectedRecipeIds(newSet);
                              }
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 flex items-start gap-3">
                                {selectionMode && (
                                  <Checkbox
                                    checked={selectedRecipeIds.has(recipeId)}
                                    onCheckedChange={(checked) => {
                                      const newSet = new Set(selectedRecipeIds);
                                      if (checked) {
                                        newSet.add(recipeId);
                                      } else {
                                        newSet.delete(recipeId);
                                      }
                                      setSelectedRecipeIds(newSet);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg">{recipe.name}</h3>
                                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                                </div>
                              </div>
                              {!selectionMode && (
                                <div className="flex gap-2">
                                  <Button
                                    variant={isLiked === true ? "default" : "outline"}
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRecipePreference(recipe.id, true);
                                    }}
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant={isLiked === false ? "destructive" : "outline"}
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRecipePreference(recipe.id, false);
                                    }}
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {recipe.prep_time + recipe.cook_time} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {recipe.servings} porciones
                              </span>
                            </div>

                            {!selectionMode && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecipe(recipe);
                                  setSelectedIngredients(new Set());
                                }}
                              >
                                Ver Receta Completa
                              </Button>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </Card>
          ))}
        </div>
      </main>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.name}</DialogTitle>
          </DialogHeader>

          {selectedRecipe && (
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedRecipe.description}</p>

              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Prep: {selectedRecipe.prep_time} min | Cook: {selectedRecipe.cook_time} min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {selectedRecipe.servings} porciones
                </span>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Ingredientes:</h4>
                <ul className="space-y-1">
                  {selectedRecipe.ingredients?.map((ing: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      • {ing.amount} {ing.unit} {ing.item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Instrucciones:</h4>
                <ol className="space-y-2">
                  {selectedRecipe.instructions?.map((step: string, idx: number) => (
                    <li key={idx} className="text-sm">
                      {idx + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>

              <Button onClick={() => setShowAddToList(true)} className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar a Lista de Compras
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Shopping List Dialog */}
      <Dialog open={showAddToList} onOpenChange={setShowAddToList}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar a Lista de Compras</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="list-select" className="mb-3 block">
                Selecciona o crea una lista
              </Label>
              <Select
                value={listChoice === "new" ? "new" : selectedListId}
                onValueChange={(value) => {
                  if (value === "new") {
                    setListChoice("new");
                    setSelectedListId("");
                  } else {
                    setListChoice("existing");
                    setSelectedListId(value);
                  }
                }}
              >
                <SelectTrigger id="list-select">
                  <SelectValue placeholder="Elige una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">➕ Agregar a una lista</SelectItem>
                  {existingLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {listChoice === "new" && (
              <div>
                <Label htmlFor="list-name">Nombre de la Lista</Label>
                <Input
                  id="list-name"
                  placeholder="Mi lista de compras"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>Selecciona ingredientes:</Label>
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {selectedRecipe?.ingredients?.map((ing: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ingredient-${idx}`}
                      checked={selectedIngredients.has(idx)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedIngredients);
                        if (checked) {
                          newSet.add(idx);
                        } else {
                          newSet.delete(idx);
                        }
                        setSelectedIngredients(newSet);
                      }}
                    />
                    <label htmlFor={`ingredient-${idx}`} className="text-sm cursor-pointer">
                      {ing.amount} {ing.unit} {ing.item}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToList(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddToShoppingList}>
              {listChoice === "new" ? "Crear Lista" : "Agregar a Lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Lista de Compras</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedRecipeIds.size === 0
                ? "Se agregarán todos los ingredientes del plan completo"
                : `Se agregarán ingredientes de ${selectedRecipeIds.size} receta${selectedRecipeIds.size > 1 ? "s" : ""} seleccionada${selectedRecipeIds.size > 1 ? "s" : ""}`}
            </p>

            <div>
              <Label htmlFor="bulk-list-select" className="mb-3 block">
                Selecciona o crea una lista
              </Label>
              <Select
                value={listChoice === "new" ? "new" : selectedListId}
                onValueChange={(value) => {
                  if (value === "new") {
                    setListChoice("new");
                    setSelectedListId("");
                  } else {
                    setListChoice("existing");
                    setSelectedListId(value);
                  }
                }}
              >
                <SelectTrigger id="bulk-list-select">
                  <SelectValue placeholder="Elige una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">➕ Crear nueva lista</SelectItem>
                  {existingLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {listChoice === "new" && (
              <div>
                <Label htmlFor="bulk-list-name">Nombre de la Lista</Label>
                <Input
                  id="bulk-list-name"
                  placeholder="Mi lista de compras"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkAddToList}>{listChoice === "new" ? "Crear Lista" : "Agregar a Lista"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MiPlan;
