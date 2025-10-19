import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, User as UserIcon, Calendar, List, BookOpen, ClipboardList, LogOut, Coffee, UtensilsCrossed, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CartButton } from "@/components/Cart";

type Recipe = {
  id: string;
  name: string;
  description: string;
};
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayRecipes, setTodayRecipes] = useState<{ breakfast: Recipe[]; lunch: Recipe[]; dinner: Recipe[] } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
      });

      // THEN check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!session) {
        navigate("/auth");
      } else {
        // Load today's recipes
        await loadTodayRecipes(session.user.id);
        setLoading(false);
      }

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [navigate]);

  const loadTodayRecipes = async (userId: string) => {
    // Load the most recent meal plan
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan || !plan.recipe_ids) {
      setTodayRecipes(null);
      return;
    }

    const planData = plan.recipe_ids as any;
    const planStartDate = new Date(plan.created_at);
    const today = new Date();
    
    // Calculate which day of the plan today is
    const daysDiff = Math.floor((today.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayIndex = daysDiff % (planData.days?.length || 7); // Loop through the plan

    const todayDay = planData.days?.[dayIndex];
    if (!todayDay) {
      setTodayRecipes(null);
      return;
    }

    // Collect all recipe IDs for today
    const recipeIds = [
      ...(todayDay.breakfast || []),
      ...(todayDay.lunch || []),
      ...(todayDay.dinner || [])
    ];

    if (recipeIds.length === 0) {
      setTodayRecipes(null);
      return;
    }

    // Fetch recipes
    const { data: recipesData } = await supabase
      .from("recipes")
      .select("id, name, description")
      .in("id", recipeIds);

    if (recipesData) {
      const recipesMap = new Map(recipesData.map(r => [r.id, r]));
      setTodayRecipes({
        breakfast: (todayDay.breakfast || []).map((id: string) => recipesMap.get(id)).filter(Boolean),
        lunch: (todayDay.lunch || []).map((id: string) => recipesMap.get(id)).filter(Boolean),
        dinner: (todayDay.dinner || []).map((id: string) => recipesMap.get(id)).filter(Boolean),
      });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  const navigationCards = [
    {
      title: "Mi Plan",
      icon: Calendar,
      description: "Planifica tus comidas semanales",
      path: "/mi-plan"
    },
    {
      title: "Listas",
      icon: List,
      description: "Gestiona tus listas de compras",
      path: "/listas"
    },
    {
      title: "Recetas",
      icon: BookOpen,
      description: "Explora y guarda recetas",
      path: "/recetas"
    },
    {
      title: "Test Preferencias",
      icon: ClipboardList,
      description: "Define tus preferencias alimentarias",
      path: "/test-preferencias"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              MiCarrito
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <CartButton />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <UserIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Mi Cuenta</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-fade-in">
          {navigationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.path}
                className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate(card.path)}
              >
                <Icon className="h-10 w-10 text-primary mb-3" />
                <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </Card>
            );
          })}
        </div>

        {/* Today's Recipes */}
        {todayRecipes && (
          <Card className="p-6 bg-gradient-to-br from-accent/20 to-secondary/20 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Recetas de Hoy</h3>
            <div className="space-y-4">
              {/* Breakfast */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Coffee className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Desayuno</h4>
                </div>
                <div className="space-y-1">
                  {todayRecipes.breakfast.map((recipe) => (
                    <p key={recipe.id} className="text-sm text-muted-foreground ml-6">
                      • {recipe.name}
                    </p>
                  ))}
                  {todayRecipes.breakfast.length === 0 && (
                    <p className="text-sm text-muted-foreground ml-6">No hay recetas</p>
                  )}
                </div>
              </div>

              {/* Lunch */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Almuerzo</h4>
                </div>
                <div className="space-y-1">
                  {todayRecipes.lunch.map((recipe) => (
                    <p key={recipe.id} className="text-sm text-muted-foreground ml-6">
                      • {recipe.name}
                    </p>
                  ))}
                  {todayRecipes.lunch.length === 0 && (
                    <p className="text-sm text-muted-foreground ml-6">No hay recetas</p>
                  )}
                </div>
              </div>

              {/* Dinner */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Moon className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Cena</h4>
                </div>
                <div className="space-y-1">
                  {todayRecipes.dinner.map((recipe) => (
                    <p key={recipe.id} className="text-sm text-muted-foreground ml-6">
                      • {recipe.name}
                    </p>
                  ))}
                  {todayRecipes.dinner.length === 0 && (
                    <p className="text-sm text-muted-foreground ml-6">No hay recetas</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;