import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Settings, Coffee, UtensilsCrossed, Moon } from "lucide-react";

const MiPlan = () => {
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
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

      // Load preferences
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setMealPlan(plan);
      setPreferences(prefs);
      setLoading(false);
    };
    loadData();
  }, [navigate]);

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

  const planData = mealPlan.plan_data;
  const daysCount = planData.length;

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
          {planData.map((day: any) => (
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

                <TabsContent value="breakfast" className="mt-4">
                  <div className="grid gap-3">
                    {day.breakfast.map((meal: string, idx: number) => (
                      <Card key={idx} className="p-4 bg-accent/10">
                        <p className="font-medium">Opción {idx + 1}: {meal}</p>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="lunch" className="mt-4">
                  <div className="grid gap-3">
                    {day.lunch.map((meal: string, idx: number) => (
                      <Card key={idx} className="p-4 bg-accent/10">
                        <p className="font-medium">Opción {idx + 1}: {meal}</p>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="dinner" className="mt-4">
                  <div className="grid gap-3">
                    {day.dinner.map((meal: string, idx: number) => (
                      <Card key={idx} className="p-4 bg-accent/10">
                        <p className="font-medium">Opción {idx + 1}: {meal}</p>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MiPlan;
