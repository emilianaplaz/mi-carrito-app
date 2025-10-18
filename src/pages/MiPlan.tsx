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
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Settings, Coffee, UtensilsCrossed, Moon, ThumbsUp, ThumbsDown, ShoppingCart, Clock, Users } from "lucide-react";

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
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [preferences, setPreferences] = useState<any>(null);
  const [recipePrefs, setRecipePrefs] = useState<Record<string, boolean>>({});
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddToList, setShowAddToList] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [listName, setListName] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [navigate]);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
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
      const recipeIdsData = typeof plan.recipe_ids === 'object' && plan.recipe_ids !== null 
        ? plan.recipe_ids 
        : null;
      
      if (recipeIdsData) {
        setMealPlan(recipeIdsData);
        
        // Collect all recipe IDs
        const allRecipeIds = new Set<string>();
        const days = (recipeIdsData as any).days || [];
        for (const day of days) {
          [...(day.breakfast || []), ...(day.lunch || []), ...(day.dinner || [])].forEach(id => allRecipeIds.add(id));
        }

        // Load all recipes
        const { data: recipesData } = await supabase
          .from("recipes")
          .select("*")
          .in("id", Array.from(allRecipeIds));

        if (recipesData) {
          const recipesMap: Record<string, Recipe> = {};
          recipesData.forEach(r => { 
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
          prefsData.forEach((p: RecipePreference) => { prefsMap[p.recipe_id] = p.is_liked; });
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("user_recipe_preferences")
      .upsert({
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

  const handleAddToShoppingList = async () => {
    if (!selectedRecipe || selectedIngredients.size === 0 || !listName.trim()) {
      toast({
        title: "Error",
        description: "Por favor selecciona ingredientes y un nombre para la lista",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const selectedItems = Array.from(selectedIngredients).map(idx => selectedRecipe.ingredients[idx]);

    const { error } = await supabase.from("grocery_lists").insert({
      user_id: session.user.id,
      name: listName,
      items: selectedItems,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la lista",
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Lista creada!",
        description: "Los ingredientes fueron agregados a tu lista",
      });
      setShowAddToList(false);
      setSelectedIngredients(new Set());
      setListName("");
    }
  };

  const handleEditPreferences = () => {
    navigate("/test-preferencias");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Mi Plan</span>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">No tienes un plan todavía</h1>
            <p className="text-muted-foreground mb-6">
              Completa el test de preferencias para generar tu plan personalizado
            </p>
            <Button onClick={() => navigate("/test-preferencias")}>
              Crear Mi Plan
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const daysCount = mealPlan.days?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Mi Plan de {daysCount} Días</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleEditPreferences}>
            <Settings className="h-4 w-4 mr-2" />
            Editar Preferencias
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {mealPlan.days?.map((day: any) => (
            <Card key={day.day} className="p-6">
              <h2 className="text-2xl font-bold mb-4">Día {day.day}</h2>
              
              <Tabs defaultValue="breakfast" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="breakfast">
                    <Coffee className="h-4 w-4 mr-2" />
                    Desayuno
                  </TabsTrigger>
                  <TabsTrigger value="lunch">
                    <UtensilsCrossed className="h-4 w-4 mr-2" />
                    Comida
                  </TabsTrigger>
                  <TabsTrigger value="dinner">
                    <Moon className="h-4 w-4 mr-2" />
                    Cena
                  </TabsTrigger>
                </TabsList>

                {['breakfast', 'lunch', 'dinner'].map(mealType => (
                  <TabsContent key={mealType} value={mealType} className="mt-4">
                    <div className="grid gap-3">
                      {(day[mealType] || []).map((recipeId: string, idx: number) => {
                        const recipe = recipes[recipeId];
                        if (!recipe) return null;
                        const isLiked = recipePrefs[recipeId];

                        return (
                          <Card key={idx} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h3 className="font-bold text-lg">{recipe.name}</h3>
                                <p className="text-sm text-muted-foreground">{recipe.description}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant={isLiked === true ? "default" : "outline"}
                                  size="icon"
                                  onClick={() => handleRecipePreference(recipe.id, true)}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={isLiked === false ? "destructive" : "outline"}
                                  size="icon"
                                  onClick={() => handleRecipePreference(recipe.id, false)}
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </div>
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

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRecipe(recipe);
                                setSelectedIngredients(new Set());
                              }}
                            >
                              Ver Receta Completa
                            </Button>
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

              <Button
                onClick={() => setShowAddToList(true)}
                className="w-full"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Agregar a Lista de Compras
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to Shopping List Dialog */}
      <Dialog open={showAddToList} onOpenChange={setShowAddToList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar a Lista de Compras</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="list-name">Nombre de la Lista</Label>
              <Input
                id="list-name"
                placeholder="Mi lista de compras"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>

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
                    <label
                      htmlFor={`ingredient-${idx}`}
                      className="text-sm cursor-pointer"
                    >
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
              Crear Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MiPlan;