import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, ShoppingCart, Sparkles, TrendingDown, Bell, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-nutrition.jpg";
const Landing = () => {
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);
  const features = [
    {
      icon: ChefHat,
      title: "Menús Personalizados",
      description: "Genera menús semanales adaptados a tus objetivos, alergias y preferencias alimentarias.",
    },
    {
      icon: ShoppingCart,
      title: "Comparador de Tiendas",
      description: "Encuentra los mejores precios comparando entre múltiples supermercados locales en tiempo real.",
    },
    {
      icon: TrendingDown,
      title: "Optimización de Costos",
      description: "Reduce tu gasto en alimentos hasta un 30% con carritos divididos por tienda.",
    },
    {
      icon: Home,
      title: "Gestión de Despensa",
      description: "Actualiza tu inventario usando lenguaje natural y recibe sugerencias inteligentes.",
    },
    {
      icon: Bell,
      title: "Alertas Inteligentes",
      description: "Notificaciones de bajas de precio, reabastecimiento y ofertas personalizadas.",
    },
    {
      icon: Sparkles,
      title: "IA Nutricional",
      description: "Tecnología avanzada que calcula macros, micros y porciones perfectas para ti.",
    },
  ];
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              MiCarrito
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Iniciar Sesión
            </Button>
            <Button onClick={() => navigate("/auth")}>Comenzar Gratis</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-background -z-10" />
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Planifica tu nutrición,{" "}
                <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  optimiza tu presupuesto
                </span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Menús personalizados, autogeneración de listas de compra, comparación de precios entre supermercados y
                gestión inteligente de tu despensa. Todo en una sola plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
                  Comenzar Ahora
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <p className="text-3xl font-bold text-primary">30%</p>
                  <p className="text-sm text-muted-foreground">Ahorro promedio</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">15min</p>
                  <p className="text-sm text-muted-foreground">Por compra</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">100%</p>
                  <p className="text-sm text-muted-foreground">Personalizado</p>
                </div>
              </div>
            </div>
            <div className="relative animate-slide-in-left">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-3xl blur-3xl -z-10" />
              <img
                src={heroImage}
                alt="Fresh healthy ingredients"
                className="rounded-3xl shadow-strong w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-4">Todo lo que necesitas para comer mejor y ahorrar</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Una plataforma completa que combina nutrición inteligente con optimización de costos
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border-border bg-card"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="p-12 text-center bg-gradient-to-br from-primary/10 via-accent to-secondary/10 border-primary/20 shadow-strong">
            <h2 className="text-4xl font-bold mb-4">¿Listo para transformar tu alimentación?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Únete a miles de usuarios que ya están comiendo mejor y ahorrando dinero
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-12">
              Comenzar Gratis
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-muted/30">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">MiCarrito</span>
          </div>
          <p className="text-muted-foreground">© 2025 MiCarrito. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
export default Landing;
