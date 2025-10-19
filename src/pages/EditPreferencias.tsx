import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChefHat,
  ArrowLeft,
  Leaf,
  Apple,
  Clock,
  Target,
  Utensils,
  Check,
  Calendar,
  UtensilsCrossed,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/mi-carrit-logo.png";
import loadingCart from "@/assets/loading-cart.png";
import { CartButton } from "@/components/Cart";
import { z } from "zod";

const preferencesSchema = z.object({
  planDuration: z.string(),
  breakfastOptions: z.number().min(1).max(5),
  lunchOptions: z.number().min(1).max(5),
  dinnerOptions: z.number().min(1).max(5),
  dietaryRestrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  cookingTime: z.string().min(1, "Por favor selecciona un tiempo de cocina"),
  healthGoals: z.array(z.string()).min(1, "Por favor selecciona al menos un objetivo"),
  cuisinePreferences: z.array(z.string()),
  budget: z.number().min(10, "El presupuesto debe ser al menos $10").optional(),
});

const EditPreferencias = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState({
    planDuration: "1_week",
    breakfastOptions: 3,
    lunchOptions: 3,
    dinnerOptions: 3,
    dietaryRestrictions: [] as string[],
    allergies: [] as string[],
    cookingTime: "",
    healthGoals: [] as string[],
    cuisinePreferences: [] as string[],
    budget: undefined as number | undefined,
  });

  const sections = [
    {
      title: "Duración del Plan",
      icon: Calendar,
      field: "planDuration" as const,
      single: true,
      options: [
        { value: "1_week", label: "1 Semana", icon: "📅" },
        { value: "2_weeks", label: "2 Semanas", icon: "🗓️" },
      ],
    },
    {
      title: "Restricciones Dietéticas",
      icon: Leaf,
      field: "dietaryRestrictions" as const,
      options: [
        { value: "vegetariano", label: "Vegetariano", icon: "🥗" },
        { value: "vegano", label: "Vegano", icon: "🌱" },
        { value: "sin-gluten", label: "Sin Gluten", icon: "🌾" },
        { value: "sin-lactosa", label: "Sin Lactosa", icon: "🥛" },
        { value: "keto", label: "Keto", icon: "🥑" },
        { value: "paleo", label: "Paleo", icon: "🍖" },
        { value: "ninguna", label: "Ninguna", icon: "✅" },
      ],
    },
    {
      title: "Alergias",
      icon: Apple,
      field: "allergies" as const,
      options: [
        { value: "nueces", label: "Nueces", icon: "🥜" },
        { value: "mariscos", label: "Mariscos", icon: "🦐" },
        { value: "soya", label: "Soya", icon: "🫘" },
        { value: "huevos", label: "Huevos", icon: "🥚" },
        { value: "pescado", label: "Pescado", icon: "🐟" },
        { value: "lacteos", label: "Lácteos", icon: "🧀" },
        { value: "ninguna", label: "Ninguna", icon: "✅" },
      ],
    },
    {
      title: "Tiempo de Cocina",
      icon: Clock,
      field: "cookingTime" as const,
      options: [
        { value: "15-min", label: "15 minutos", icon: "⚡" },
        { value: "30-min", label: "30 minutos", icon: "⏱️" },
        { value: "1-hora", label: "1 hora", icon: "🕐" },
        { value: "mas-1-hora", label: "Más de 1 hora", icon: "⏳" },
      ],
      single: true,
    },
    {
      title: "Objetivos de Salud",
      icon: Target,
      field: "healthGoals" as const,
      options: [
        { value: "perder-peso", label: "Perder Peso", icon: "📉" },
        { value: "ganar-musculo", label: "Ganar Músculo", icon: "💪" },
        { value: "mantener-peso", label: "Mantener Peso", icon: "⚖️" },
        { value: "energia", label: "Más Energía", icon: "⚡" },
        { value: "salud-general", label: "Salud General", icon: "❤️" },
        { value: "digestivo", label: "Salud Digestiva", icon: "🌿" },
      ],
    },
    {
      title: "Preferencias de Cocina",
      icon: Utensils,
      field: "cuisinePreferences" as const,
      options: [
        { value: "mexicana", label: "Mexicana", icon: "🌮" },
        { value: "italiana", label: "Italiana", icon: "🍝" },
        { value: "asiatica", label: "Asiática", icon: "🍜" },
        { value: "mediterranea", label: "Mediterránea", icon: "🥙" },
        { value: "americana", label: "Americana", icon: "🍔" },
        { value: "india", label: "India", icon: "🍛" },
        { value: "todas", label: "Todas", icon: "🌍" },
      ],
    },
  ];

  useEffect(() => {
    const loadPreferences = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      try {
        const { data: existingPrefs, error } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (!error && existingPrefs) {
          setPreferences({
            planDuration: existingPrefs.plan_duration || "1_week",
            breakfastOptions: existingPrefs.breakfast_options || 3,
            lunchOptions: existingPrefs.lunch_options || 3,
            dinnerOptions: existingPrefs.dinner_options || 3,
            dietaryRestrictions: Array.isArray(existingPrefs.dietary_restrictions)
              ? existingPrefs.dietary_restrictions
              : [],
            allergies: Array.isArray(existingPrefs.allergies) ? existingPrefs.allergies : [],
            cookingTime: existingPrefs.cooking_time || "",
            healthGoals: Array.isArray(existingPrefs.health_goals) ? existingPrefs.health_goals : [],
            cuisinePreferences: Array.isArray(existingPrefs.cuisine_preferences)
              ? existingPrefs.cuisine_preferences
              : [],
            budget: existingPrefs.budget || undefined,
          });
          setIsFirstTime(false);
        } else {
          // No preferences found, first time user
          setIsFirstTime(true);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus preferencias",
          variant: "destructive",
        });
      }

      setLoading(false);
    };
    loadPreferences();
  }, [navigate, toast]);

  const toggleOption = (field: keyof typeof preferences, value: string, single = false) => {
    if (single) {
      setPreferences({ ...preferences, [field]: value });
    } else {
      const current = preferences[field] as string[];
      if (current.includes(value)) {
        setPreferences({ ...preferences, [field]: current.filter((v) => v !== value) });
      } else {
        setPreferences({ ...preferences, [field]: [...current, value] });
      }
    }
  };

  const handleNumberChange = (field: string, value: number) => {
    setPreferences({
      ...preferences,
      [field]: value,
    });
  };

  const handleSubmit = async (shouldGeneratePlan: boolean) => {
    try {
      const validated = preferencesSchema.parse(preferences);
      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para guardar tus preferencias",
          variant: "destructive",
        });
        return;
      }

      // Save preferences
      const { error: prefsError } = await supabase.from("user_preferences").upsert({
        user_id: session.user.id,
        dietary_restrictions: validated.dietaryRestrictions,
        allergies: validated.allergies,
        cooking_time: validated.cookingTime,
        health_goals: validated.healthGoals,
        cuisine_preferences: validated.cuisinePreferences,
        plan_duration: validated.planDuration,
        breakfast_options: validated.breakfastOptions,
        lunch_options: validated.lunchOptions,
        dinner_options: validated.dinnerOptions,
        budget: validated.budget,
      });

      if (prefsError) throw prefsError;

      if (!shouldGeneratePlan) {
        toast({
          title: "¡Preferencias guardadas!",
          description: "Tus preferencias han sido actualizadas",
        });
        navigate("/dashboard");
        return;
      }

      // Generate AI-powered meal plan
      toast({
        title: "Generando tu plan...",
        description: "Esto puede tomar unos momentos",
      });

      const { data: planData, error: planGenError } = await supabase.functions.invoke("generate-meal-plan", {
        body: { preferences: validated },
      });

      if (planGenError) {
        throw new Error(`Error generando plan: ${planGenError.message || "Error desconocido"}`);
      }

      if (!planData?.success) {
        throw new Error(planData?.error || "No se pudo generar el plan de comidas");
      }

      // Save meal plan with recipe IDs
      const { error: planError } = await supabase.from("meal_plans").upsert({
        user_id: session.user.id,
        plan_data: planData.plan.days,
        recipe_ids: planData.plan,
      });

      if (planError) {
        throw planError;
      }

      toast({
        title: "¡Plan creado exitosamente!",
        description: "Tu plan personalizado está listo",
      });

      navigate("/mi-plan");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Información incompleta",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving preferences:", error);
        const errorMessage = error instanceof Error ? error.message : "No se pudieron guardar tus preferencias";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src={loadingCart} alt="Loading" className="w-32 h-auto object-contain animate-pulse" />
      </div>
    );
  }

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
              <span className="text-lg font-bold">Editar Preferencias</span>
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {isFirstTime && (
          <Card className="p-6 mb-6 bg-primary/10 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary rounded-full">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">¡Bienvenido a MiCarrito!</h3>
                <p className="text-muted-foreground">
                  Configura tus preferencias alimentarias para comenzar a generar planes de comidas personalizados.
                  Una vez que guardes tus preferencias, podrás regresar aquí en cualquier momento para actualizarlas.
                </p>
              </div>
            </div>
          </Card>
        )}
        <div className="space-y-6">
          {/* Meal Options */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Opciones de Comidas</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breakfast">Desayuno</Label>
                <Input
                  id="breakfast"
                  type="number"
                  min={1}
                  max={5}
                  value={preferences.breakfastOptions}
                  onChange={(e) => handleNumberChange("breakfastOptions", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lunch">Comida</Label>
                <Input
                  id="lunch"
                  type="number"
                  min={1}
                  max={5}
                  value={preferences.lunchOptions}
                  onChange={(e) => handleNumberChange("lunchOptions", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dinner">Cena</Label>
                <Input
                  id="dinner"
                  type="number"
                  min={1}
                  max={5}
                  value={preferences.dinnerOptions}
                  onChange={(e) => handleNumberChange("dinnerOptions", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </Card>

          {/* Budget */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Presupuesto Semanal</h2>
            </div>
            <div className="max-w-md">
              <div className="space-y-2">
                <Label htmlFor="budget">Presupuesto ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={10}
                  step={5}
                  placeholder="Ej: 50"
                  value={preferences.budget || ""}
                  onChange={(e) => handleNumberChange("budget", parseFloat(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Las recomendaciones de compra no excederán este presupuesto
                </p>
              </div>
            </div>
          </Card>

          {/* All other sections */}
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.field} className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {section.options.map((option) => {
                    const isSelected = section.single
                      ? preferences[section.field] === option.value
                      : (preferences[section.field] as string[]).includes(option.value);

                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleOption(section.field, option.value, section.single)}
                        className={`
                          relative p-4 rounded-lg border-2 transition-all duration-300
                          ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-md"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{option.icon}</span>
                          <span className="font-medium text-left">{option.label}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          {/* Action Buttons */}
          <div className="flex gap-4 sticky bottom-4 bg-background p-4 border border-border rounded-lg shadow-lg">
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={saving} className="flex-1">
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={saving} className="flex-1">
              {saving ? "Generando..." : "Guardar y Regenerar Plan"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditPreferencias;
