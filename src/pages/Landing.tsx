import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, ShoppingCart, Sparkles, TrendingDown, Bell, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-carrito.jpg";
const Landing = () => {
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();
  }, [navigate]);
  const features = [{
    icon: ChefHat,
    title: "Menús Personalizados",
    description: "Genera menús semanales adaptados a tus objetivos, alergias y preferencias alimentarias."
  }, {
    icon: Bell,
    title: "Comparador de Precios",
    description: "Encuentra los mejores precios comparando entre múltiples supermercados locales en tiempo real."
  }, {
    icon: ShoppingCart,
    title: "Mercado inteligente",
    description: "Automatiza la compra de tu mercado según tus necesidades."
  }, {
    icon: Home,
    title: "Gestión de listas de compra",
    description: "Crea listas de compra y recibe recomendaciones de nuevos productos por mejores precios."
  }, {
    icon: TrendingDown,
    title: "Optimización de Costos",
    description: "Reduce tu gasto en alimentos con carritos divididos por tienda."
  }, {
    icon: Sparkles,
    title: "IA Nutricional",
    description: "Tecnología avanzada que calcula macros, micros y porciones perfectas para ti."
  }];
  return <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">
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
      <section className="px-4 bg-background pt-20">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in pt-4">
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              Planifica tu nutrición,{" "}
              <span className="text-primary">
                optimiza tu presupuesto
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Menús personalizados, autogeneración de listas de compra, comparación de precios entre supermercados y
              gestión inteligente de tu despensa. Todo en una sola plataforma.
            </p>
            
          </div>
        </div>
      </section>

      {/* Hero Banner Image */}
      <section className="mt-12 relative">
        <div className="w-full">
          <img src={heroImage} alt="Mi Carrito - Shopping Cart" className="w-full h-auto object-cover" />
          <div className="absolute top-8 left-0 right-0 flex justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Comenzar Ahora
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold mb-4">Mas ahorro. Menos tiempo. Menos esfuerzo.</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Optimiza tu alimentación de la manera más inteligente.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => <Card key={index} className="p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border-border bg-card" style={{
            animationDelay: `${index * 100}ms`
          }}>
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="p-12 text-center bg-card border-primary shadow-strong">
            <h2 className="text-4xl font-bold mb-4">¿Listo para transformar tu alimentación?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Únete al equipo que ya está comiendo mejor y ahorrando dinero
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-12">
              Comenzar Gratis
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-muted">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">MiCarrito</span>
          </div>
          <p className="text-muted-foreground">© 2025 MiCarrito. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>;
};
export default Landing;