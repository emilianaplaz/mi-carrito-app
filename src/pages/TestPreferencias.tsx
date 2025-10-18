import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, ArrowLeft, Leaf, Apple, Clock, Target, Utensils, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";

const preferencesSchema = z.object({
  dietaryRestrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  cookingTime: z.string().min(1, "Por favor selecciona un tiempo de cocina"),
  healthGoals: z.array(z.string()).min(1, "Por favor selecciona al menos un objetivo"),
  cuisinePreferences: z.array(z.string()),
});

const TestPreferencias = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [preferences, setPreferences] = useState({
    dietaryRestrictions: [] as string[],
    allergies: [] as string[],
    cookingTime: "",
    healthGoals: [] as string[],
    cuisinePreferences: [] as string[],
  });

  const steps = [
    {
      title: "Restricciones Dietéticas",
      icon: Leaf,
      description: "Selecciona todas las que apliquen",
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
      description: "Indica tus alergias alimentarias",
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
      description: "¿Cuánto tiempo tienes para cocinar?",
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
      description: "¿Qué quieres lograr?",
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
      description: "¿Qué tipos de cocina prefieres?",
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
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setLoading(false);
    };
    checkUser();
  }, [navigate]);

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

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const validated = preferencesSchema.parse(preferences);
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para guardar tus preferencias",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("user_preferences").insert({
        user_id: session.user.id,
        dietary_restrictions: validated.dietaryRestrictions,
        allergies: validated.allergies,
        cooking_time: validated.cookingTime,
        health_goals: validated.healthGoals,
        cuisine_preferences: validated.cuisinePreferences,
      });

      if (error) throw error;

      toast({
        title: "¡Preferencias guardadas!",
        description: "Generando tu plan personalizado...",
      });

      setTimeout(() => {
        navigate("/mi-plan");
      }, 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Información incompleta",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error saving preferences:", error);
        toast({
          title: "Error",
          description: "No se pudieron guardar tus preferencias",
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
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Test de Preferencias</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8 animate-fade-in">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Paso {currentStep + 1} de {steps.length}</span>
            <span>{Math.round(progress)}% completado</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="p-8 mb-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <p className="text-muted-foreground">{currentStepData.description}</p>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentStepData.options.map((option) => {
              const isSelected = currentStepData.single
                ? preferences[currentStepData.field] === option.value
                : (preferences[currentStepData.field] as string[]).includes(option.value);

              return (
                <button
                  key={option.value}
                  onClick={() => toggleOption(currentStepData.field, option.value, currentStepData.single)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all duration-300
                    ${isSelected
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

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex-1"
          >
            Atrás
          </Button>
          <Button
            onClick={handleNext}
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Guardando..." : currentStep === steps.length - 1 ? "Finalizar" : "Siguiente"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default TestPreferencias;
