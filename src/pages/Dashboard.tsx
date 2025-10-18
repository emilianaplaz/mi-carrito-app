import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, User as UserIcon, Calendar, List, BookOpen, ClipboardList, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
        // Check if user has completed preferences
        const { data: prefs } = await supabase
          .from("user_preferences")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (!prefs) {
          navigate("/test-preferencias");
        } else {
          setLoading(false);
        }
      }

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, [navigate]);

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

        {/* Metrics Card */}
        <Card className="p-6 bg-gradient-to-br from-accent/20 to-secondary/20 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Resumen de Hoy</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground mt-1">Calorías</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground mt-1">Recetas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground mt-1">Listas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground mt-1">Comidas</p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;