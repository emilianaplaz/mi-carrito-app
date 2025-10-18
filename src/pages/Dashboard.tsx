import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, LogOut, User as UserIcon, UtensilsCrossed, ShoppingBasket, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    });
    navigate("/");
  };

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              MiCarrito
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">
            Bienvenido a MiCarrito
          </h1>
          <p className="text-muted-foreground text-lg">
            Comienza a planificar tu alimentación y optimizar tus compras
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <UserIcon className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Mi Perfil</h3>
            <p className="text-muted-foreground mb-4">
              Configura tus objetivos, alergias y preferencias alimentarias
            </p>
            <Button variant="outline" className="w-full">
              Configurar Perfil
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <UtensilsCrossed className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Menú Semanal</h3>
            <p className="text-muted-foreground mb-4">
              Genera y gestiona tus menús personalizados con IA
            </p>
            <Button variant="outline" className="w-full">
              Ver Menú
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <Home className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Mi Despensa</h3>
            <p className="text-muted-foreground mb-4">
              Gestiona tu inventario con lenguaje natural
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/pantry")}
            >
              Gestionar Despensa
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <ShoppingBasket className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Comparador de Tiendas</h3>
            <p className="text-muted-foreground mb-4">
              Encuentra los mejores precios para tu lista de compras
            </p>
            <Button variant="outline" className="w-full">
              Comparar Precios
            </Button>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center text-xs font-bold text-secondary-foreground">
                Pro
              </div>
              <span className="text-sm font-semibold">Cuenta Gratuita</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Actualizar a Premium</h3>
            <p className="text-muted-foreground mb-4">
              Desbloquea alertas de precios, recompras automáticas y más
            </p>
            <Button className="w-full">
              Ver Planes Premium
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;