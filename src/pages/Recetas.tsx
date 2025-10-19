import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, ThumbsUp, Clock, Users, Heart, Eye, Trash2, UtensilsCrossed } from "lucide-react";

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
          <div className="grid gap-6 md:grid-cols-2">
            {likedRecipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 hover:border-primary/50"
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative p-6">
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed className="h-5 w-5 text-primary" />
                        <Badge variant="secondary" className="text-xs">
                          {recipe.meal_type || 'Receta'}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                        {recipe.name}
                      </h3>
                    </div>
                    <Heart className="h-5 w-5 text-destructive fill-destructive flex-shrink-0" />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {recipe.description}
                  </p>
                  
                  <Separator className="mb-4" />

                  {/* Recipe Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Clock className="h-4 w-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Tiempo Total</span>
                        <span className="text-sm font-semibold">
                          {recipe.prep_time + recipe.cook_time} min
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Users className="h-4 w-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Porciones</span>
                        <span className="text-sm font-semibold">
                          {recipe.servings}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cuisine Type */}
                  {recipe.cuisine_type && (
                    <div className="mb-4">
                      <Badge variant="outline" className="text-xs">
                        🌍 {recipe.cuisine_type}
                      </Badge>
                    </div>
                  )}

                  {/* Dietary Tags */}
                  {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {recipe.dietary_tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {recipe.dietary_tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{recipe.dietary_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <Separator className="mb-4" />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      onClick={() => setSelectedRecipe(recipe)}
                      className="w-full group/btn"
                    >
                      <Eye className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                      Ver Receta Completa
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRemoveLike(recipe.id)}
                      className="w-full group/btn hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                      Remover
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              <DialogTitle className="text-2xl">{selectedRecipe?.name}</DialogTitle>
            </div>
            {selectedRecipe?.meal_type && (
              <Badge variant="secondary" className="w-fit">
                {selectedRecipe.meal_type}
              </Badge>
            )}
          </DialogHeader>
          
          {selectedRecipe && (
            <div className="space-y-6 pt-4">
              {/* Description */}
              <div>
                <p className="text-muted-foreground leading-relaxed">
                  {selectedRecipe.description}
                </p>
              </div>

              <Separator />

              {/* Recipe Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">Prep</span>
                  <span className="text-sm font-semibold">{selectedRecipe.prep_time} min</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">Cocción</span>
                  <span className="text-sm font-semibold">{selectedRecipe.cook_time} min</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">Porciones</span>
                  <span className="text-sm font-semibold">{selectedRecipe.servings}</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-sm font-semibold">
                    {selectedRecipe.prep_time + selectedRecipe.cook_time} min
                  </span>
                </div>
              </div>

              {/* Dietary Tags */}
              {selectedRecipe.dietary_tags && selectedRecipe.dietary_tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline" className="h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      ✓
                    </Badge>
                    Características
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.dietary_tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Ingredients */}
              <div>
                <h4 className="font-semibold mb-4 text-lg flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    🥗
                  </div>
                  Ingredientes
                </h4>
                <div className="grid gap-2">
                  {selectedRecipe.ingredients?.map((ing: any, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-sm">
                        <span className="font-semibold">{ing.amount} {ing.unit}</span> {ing.item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Instructions */}
              <div>
                <h4 className="font-semibold mb-4 text-lg flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    👨‍🍳
                  </div>
                  Instrucciones
                </h4>
                <div className="space-y-4">
                  {selectedRecipe.instructions?.map((step: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="flex gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <p className="text-sm leading-relaxed pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recetas;