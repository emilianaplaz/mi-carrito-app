import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, ThumbsUp, Clock, Users } from "lucide-react";

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

const Recetas = () => {
  const [loading, setLoading] = useState(true);
  const [likedRecipes, setLikedRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadLikedRecipes();
  }, [navigate]);

  const loadLikedRecipes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get liked recipe IDs
    const { data: preferences } = await supabase
      .from("user_recipe_preferences")
      .select("recipe_id")
      .eq("user_id", session.user.id)
      .eq("is_liked", true);

    if (preferences && preferences.length > 0) {
      const recipeIds = preferences.map(p => p.recipe_id);
      
      // Get full recipe details
      const { data: recipes, error } = await supabase
        .from("recipes")
        .select("*")
        .in("id", recipeIds);

      if (error) {
        console.error("Error loading recipes:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las recetas",
          variant: "destructive",
        });
      } else {
        const formattedRecipes = (recipes || []).map(r => ({
          ...r,
          ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          instructions: Array.isArray(r.instructions) ? r.instructions : [],
        })) as Recipe[];
        setLikedRecipes(formattedRecipes);
      }
    }

    setLoading(false);
  };

  const handleRemoveLike = async (recipeId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("user_recipe_preferences")
      .delete()
      .eq("user_id", session.user.id)
      .eq("recipe_id", recipeId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la preferencia",
        variant: "destructive",
      });
    } else {
      setLikedRecipes(likedRecipes.filter(r => r.id !== recipeId));
      toast({
        title: "Receta removida",
        description: "La receta fue removida de tus favoritos",
      });
    }
  };

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
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Mis Recetas Favoritas</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {likedRecipes.length === 0 ? (
          <Card className="p-8 text-center">
            <ThumbsUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No tienes recetas favoritas</h2>
            <p className="text-muted-foreground mb-6">
              Dale "me gusta" a las recetas de tu plan para guardarlas aquí
            </p>
            <Button onClick={() => navigate("/mi-plan")}>
              Ir a Mi Plan
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {likedRecipes.map((recipe) => (
              <Card key={recipe.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{recipe.name}</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {recipe.meal_type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{recipe.description}</p>
                    
                    <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {recipe.prep_time + recipe.cook_time} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {recipe.servings} porciones
                      </span>
                      {recipe.cuisine_type && (
                        <span>• {recipe.cuisine_type}</span>
                      )}
                    </div>

                    {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {recipe.dietary_tags.map((tag, idx) => (
                          <span key={idx} className="text-xs bg-accent px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    Ver Receta
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleRemoveLike(recipe.id)}
                  >
                    Remover
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recetas;