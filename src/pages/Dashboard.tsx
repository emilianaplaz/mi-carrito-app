import { useEffect, useState } from "react";
import logo from "@/assets/mi-carrit-logo.png";
import loadingCart from "@/assets/loading-cart.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChefHat, User as UserIcon, Calendar, List, BookOpen, ClipboardList, LogOut, Coffee, UtensilsCrossed, Moon, ThumbsUp, ThumbsDown, Clock, Users, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CartButton } from "@/components/Cart";
import { BCVRate } from "@/components/BCVRate";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay, parseISO, isWithinInterval, isBefore, isAfter } from "date-fns";
import { es } from "date-fns/locale";
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

type AutomatedList = {
  id: string;
  name: string;
  next_scheduled_date: string;
  automation_frequency: string;
  items: any[];
};
const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayRecipes, setTodayRecipes] = useState<{
    breakfast: Recipe[];
    lunch: Recipe[];
    dinner: Recipe[];
  } | null>(null);
  const [todayDate, setTodayDate] = useState<string>("");
  const [recipePrefs, setRecipePrefs] = useState<Record<string, boolean>>({});
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showPreferencesPrompt, setShowPreferencesPrompt] = useState(false);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [automatedLists, setAutomatedLists] = useState<AutomatedList[]>([]);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    const initAuth = async () => {
      // Set up auth state listener FIRST
      const {
        data: {
          subscription
        }
      } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
      });

      // THEN check for existing session
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        // Check if user has preferences
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        
        setHasPreferences(!!prefs);
        
        // Load today's recipes
        await loadTodayRecipes(session.user.id);
        
        // Load automated lists and current week
        await loadAutomatedLists(session.user.id);
        initializeWeek();
        
        setLoading(false);
      }
      return () => subscription.unsubscribe();
    };
    initAuth();
  }, [navigate]);
  const loadTodayRecipes = async (userId: string) => {
    // Load the most recent meal plan
    const {
      data: plan
    } = await supabase.from("meal_plans").select("*").eq("user_id", userId).order("created_at", {
      ascending: false
    }).limit(1).maybeSingle();
    if (!plan || !plan.recipe_ids) {
      setTodayRecipes(null);
      // Show preferences prompt if no meal plan exists
      setShowPreferencesPrompt(true);
      return;
    }
    const planData = plan.recipe_ids as any;
    const planStartDate = new Date(plan.created_at);
    const today = new Date();

    // Set today's date display
    setTodayDate(today.toLocaleDateString("es-VE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }));

    // Calculate which day of the plan today is
    const daysDiff = Math.floor((today.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayIndex = daysDiff % (planData.days?.length || 7); // Loop through the plan

    const todayDay = planData.days?.[dayIndex];
    if (!todayDay) {
      setTodayRecipes(null);
      return;
    }

    // Collect all recipe IDs for today
    const recipeIds = [...(todayDay.breakfast || []), ...(todayDay.lunch || []), ...(todayDay.dinner || [])];
    if (recipeIds.length === 0) {
      setTodayRecipes(null);
      return;
    }

    // Fetch recipes with full details
    const {
      data: recipesData
    } = await supabase.from("recipes").select("*").in("id", recipeIds);
    if (recipesData) {
      const recipesMap = new Map(recipesData.map(r => [r.id, {
        ...r,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: Array.isArray(r.instructions) ? r.instructions : []
      }]));
      setTodayRecipes({
        breakfast: (todayDay.breakfast || []).map((id: string) => recipesMap.get(id)).filter(Boolean),
        lunch: (todayDay.lunch || []).map((id: string) => recipesMap.get(id)).filter(Boolean),
        dinner: (todayDay.dinner || []).map((id: string) => recipesMap.get(id)).filter(Boolean)
      });
    }

    // Load user recipe preferences
    const {
      data: prefsData
    } = await supabase.from("user_recipe_preferences").select("recipe_id, is_liked").eq("user_id", userId);
    if (prefsData) {
      const prefsMap: Record<string, boolean> = {};
      prefsData.forEach((p: any) => {
        prefsMap[p.recipe_id] = p.is_liked;
      });
      setRecipePrefs(prefsMap);
    }
  };
  const handleRecipePreference = async (recipeId: string, isLiked: boolean) => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      error
    } = await supabase.from("user_recipe_preferences").upsert({
      user_id: session.user.id,
      recipe_id: recipeId,
      is_liked: isLiked
    });
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la preferencia",
        variant: "destructive"
      });
    } else {
      setRecipePrefs({
        ...recipePrefs,
        [recipeId]: isLiked
      });
      toast({
        title: isLiked ? "¡Te gusta esta receta!" : "Receta marcada",
        description: isLiked ? "Guardada en tus recetas" : "No se recomendará en el futuro"
      });
    }
  };

  const initializeWeek = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    setWeekDays(days);
  };

  const loadAutomatedLists = async (userId: string) => {
    const { data } = await supabase
      .from("grocery_lists")
      .select("id, name, next_scheduled_date, automation_frequency, items")
      .eq("user_id", userId)
      .eq("is_automated", true)
      .order("next_scheduled_date", { ascending: true });

    if (data) {
      setAutomatedLists(data.map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items : []
      })));
    }
  };

  const getListOccurrencesInWeek = (list: AutomatedList) => {
    const occurrences: Date[] = [];
    if (!list.next_scheduled_date || !list.automation_frequency || weekDays.length === 0) return occurrences;
    
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    let currentDate = parseISO(list.next_scheduled_date);
    
    // Go backwards to find occurrences before next_scheduled_date
    if (isAfter(currentDate, weekEnd)) {
      let backwardDate = currentDate;
      while (isAfter(backwardDate, weekStart)) {
        if (list.automation_frequency === "weekly") {
          backwardDate = addDays(backwardDate, -7);
        } else if (list.automation_frequency === "bi-weekly") {
          backwardDate = addDays(backwardDate, -14);
        } else if (list.automation_frequency === "monthly") {
          backwardDate = addDays(backwardDate, -30);
        } else if (list.automation_frequency === "buy_once") {
          break;
        }
        
        if (isWithinInterval(backwardDate, { start: weekStart, end: weekEnd })) {
          occurrences.push(backwardDate);
        }
      }
      return occurrences.sort((a, b) => a.getTime() - b.getTime());
    }
    
    // Go forward from next_scheduled_date
    while (isBefore(currentDate, weekEnd) || isSameDay(currentDate, weekEnd)) {
      if (isWithinInterval(currentDate, { start: weekStart, end: weekEnd })) {
        occurrences.push(currentDate);
      }
      
      if (list.automation_frequency === "weekly") {
        currentDate = addDays(currentDate, 7);
      } else if (list.automation_frequency === "bi-weekly") {
        currentDate = addDays(currentDate, 14);
      } else if (list.automation_frequency === "monthly") {
        currentDate = addDays(currentDate, 30);
      } else if (list.automation_frequency === "buy_once") {
        break;
      } else {
        break;
      }
    }
    
    return occurrences;
  };

  const getListsForDay = (day: Date) => {
    const listsForThisDay: AutomatedList[] = [];
    automatedLists.forEach(list => {
      const occurrences = getListOccurrencesInWeek(list);
      if (occurrences.some(occurrence => isSameDay(occurrence, day))) {
        listsForThisDay.push(list);
      }
    });
    return listsForThisDay;
  };

  const frequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "bg-blue-500";
      case "bi-weekly":
        return "bg-purple-500";
      case "monthly":
        return "bg-green-500";
      case "buy_once":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const frequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "Semanal";
      case "bi-weekly":
        return "Quincenal";
      case "monthly":
        return "Mensual";
      case "buy_once":
        return "Una Vez";
      default:
        return frequency;
    }
  };

  const handleSignOut = async () => {
    try {
      const {
        error
      } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente"
      });
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive"
      });
    }
  };
  const navigationCards = [{
    title: "Mi Plan",
    icon: Calendar,
    description: "Planifica tus comidas semanales",
    path: "/mi-plan"
  }, {
    title: "Listas",
    icon: List,
    description: "Gestiona tus listas de compras",
    path: "/listas"
  }, {
    title: "Recetas",
    icon: BookOpen,
    description: "Explora y guarda recetas",
    path: "/recetas"
  }, {
    title: "Preferencias",
    icon: ClipboardList,
    description: "Define y actualiza tus preferencias alimentarias",
    path: "/editar-preferencias"
  }];
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <img src={loadingCart} alt="Loading" className="w-32 h-auto object-contain animate-pulse" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex-1">
            <BCVRate />
          </div>

          <div className="flex items-center justify-center">
            <img src={logo} alt="MiCarrit" className="h-28" />
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")}>
              <Calendar className="h-5 w-5" />
            </Button>
            <CartButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <UserIcon className="h-12 w-12" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Mi Cuenta</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/editar-preferencias")} className="cursor-pointer">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  <span>Editar Preferencias</span>
                </DropdownMenuItem>
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
          {navigationCards.map(card => {
          const Icon = card.icon;
          return <Card key={card.path} className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => navigate(card.path)}>
                <Icon className="h-10 w-10 text-primary mb-3" />
                <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </Card>;
        })}
        </div>

        {/* Today's Recipes */}
        {todayRecipes && <Card className="p-6 bg-primary animate-fade-in">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-50">Recetas de Hoy</h3>
              <p className="text-sm capitalize text-slate-50">{todayDate}</p>
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

              {["breakfast", "lunch", "dinner"].map(mealType => <TabsContent key={mealType} value={mealType} className="mt-4">
                  <div className="grid gap-3">
                    {todayRecipes[mealType as keyof typeof todayRecipes].map((recipe: Recipe) => {
                const isLiked = recipePrefs[recipe.id];
                return <Card key={recipe.id} className="p-4 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{recipe.name}</h3>
                              <p className="text-sm text-muted-foreground">{recipe.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant={isLiked === true ? "default" : "outline"} size="icon" onClick={() => handleRecipePreference(recipe.id, true)}>
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              <Button variant={isLiked === false ? "destructive" : "outline"} size="icon" onClick={() => handleRecipePreference(recipe.id, false)}>
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

                          <Button variant="outline" size="sm" onClick={() => setSelectedRecipe(recipe)}>
                            Ver Receta Completa
                          </Button>
                        </Card>;
              })}
                    {todayRecipes[mealType as keyof typeof todayRecipes].length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay recetas</p>}
                  </div>
              </TabsContent>)}
            </Tabs>
          </Card>}

        {/* Current Week Calendar */}
        {weekDays.length > 0 && (
          <Card className="p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Listas de Esta Semana
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate("/calendar")}>
                Ver Calendario Completo
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const listsForDay = getListsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <Card
                    key={day.toISOString()}
                    className={`p-3 min-h-[120px] ${
                      isToday ? "border-2 border-primary" : ""
                    } ${listsForDay.length > 0 ? "bg-primary/5" : ""}`}
                  >
                    <div className="text-center mb-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {format(day, "EEE", { locale: es })}
                      </div>
                      <div className="text-lg font-bold">
                        {format(day, "d")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {listsForDay.map((list) => (
                        <div
                          key={list.id}
                          className="text-xs p-1 rounded bg-card border cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => navigate(`/comprar-lista?id=${list.id}`)}
                        >
                          <div className="font-medium truncate text-center mb-1">{list.name}</div>
                          <Badge
                            className={`text-xs w-full justify-center ${frequencyBadgeColor(list.automation_frequency)}`}
                          >
                            {frequencyLabel(list.automation_frequency)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>

            {automatedLists.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span>Semanal</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-500"></div>
                  <span>Quincenal</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span>Mensual</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500"></div>
                  <span>Una Vez</span>
                </div>
              </div>
            )}
          </Card>
        )}
      </main>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={open => !open && setSelectedRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRecipe?.name}</DialogTitle>
          </DialogHeader>

          {selectedRecipe && <div className="space-y-4">
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
                  {selectedRecipe.ingredients?.map((ing: any, idx: number) => <li key={idx} className="text-sm">
                      • {ing.amount} {ing.unit} {ing.item}
                    </li>)}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Instrucciones:</h4>
                <ol className="space-y-2">
                  {selectedRecipe.instructions?.map((step: string, idx: number) => <li key={idx} className="text-sm">
                      {idx + 1}. {step}
                    </li>)}
                </ol>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Preferences Prompt Dialog */}
      <Dialog open={showPreferencesPrompt} onOpenChange={setShowPreferencesPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¡Bienvenido a MiCarrito!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Para comenzar a usar MiCarrito y generar tu plan de comidas personalizado, necesitamos conocer tus preferencias alimentarias.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => {
              setShowPreferencesPrompt(false);
              navigate("/editar-preferencias");
            }} className="flex-1">
                <ClipboardList className="mr-2 h-4 w-4" />
                Configurar Preferencias
              </Button>
              
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Dashboard;