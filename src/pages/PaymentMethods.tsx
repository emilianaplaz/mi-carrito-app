import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChefHat, ArrowLeft, CreditCard, Plus, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CartButton } from "@/components/Cart";
import { BCVRate } from "@/components/BCVRate";
import logo from "@/assets/mi-carrit-logo.png";
import loadingCart from "@/assets/loading-cart.png";

type PaymentMethod = {
  id: string;
  type: string;
  last_four?: string;
  card_brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
  created_at: string;
};

const PaymentMethods = () => {
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "card",
    card_number: "",
    card_brand: "",
    expiry_month: "",
    expiry_year: "",
    cvv: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", session.user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error: any) {
      console.error("Error loading payment methods:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de pago",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Basic validation
      if (formData.card_number.length < 15 || formData.card_number.length > 16) {
        toast({
          title: "Error",
          description: "Número de tarjeta inválido",
          variant: "destructive"
        });
        return;
      }

      if (!formData.expiry_month || !formData.expiry_year) {
        toast({
          title: "Error",
          description: "Fecha de expiración inválida",
          variant: "destructive"
        });
        return;
      }

      const lastFour = formData.card_number.slice(-4);
      const isFirstMethod = paymentMethods.length === 0;

      const { error } = await supabase
        .from("payment_methods")
        .insert({
          user_id: session.user.id,
          type: formData.type,
          last_four: lastFour,
          card_brand: formData.card_brand,
          expiry_month: parseInt(formData.expiry_month),
          expiry_year: parseInt(formData.expiry_year),
          is_default: isFirstMethod
        });

      if (error) throw error;

      toast({
        title: "¡Método de pago agregado!",
        description: "Tu método de pago ha sido guardado exitosamente"
      });

      setIsDialogOpen(false);
      setFormData({
        type: "card",
        card_number: "",
        card_brand: "",
        expiry_month: "",
        expiry_year: "",
        cvv: ""
      });
      loadPaymentMethods();
    } catch (error: any) {
      console.error("Error adding payment method:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar el método de pago",
        variant: "destructive"
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First, set all methods to non-default
      await supabase
        .from("payment_methods")
        .update({ is_default: false })
        .eq("user_id", session.user.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Método predeterminado actualizado",
        description: "El método de pago ha sido establecido como predeterminado"
      });

      loadPaymentMethods();
    } catch (error: any) {
      console.error("Error setting default:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el método predeterminado",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Método eliminado",
        description: "El método de pago ha sido eliminado"
      });

      loadPaymentMethods();
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el método de pago",
        variant: "destructive"
      });
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Métodos de Pago</span>
            </div>
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ChefHat className="h-10 w-10" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Tus Métodos de Pago</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Método
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Método de Pago</DialogTitle>
                <DialogDescription>
                  Agrega una nueva tarjeta de crédito o débito
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="card_number">Número de Tarjeta</Label>
                  <Input
                    id="card_number"
                    placeholder="1234 5678 9012 3456"
                    value={formData.card_number}
                    onChange={(e) => setFormData({ ...formData, card_number: e.target.value.replace(/\D/g, "").slice(0, 16) })}
                    maxLength={16}
                  />
                </div>
                <div>
                  <Label htmlFor="card_brand">Marca de Tarjeta</Label>
                  <Select value={formData.card_brand} onValueChange={(value) => setFormData({ ...formData, card_brand: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona marca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visa">Visa</SelectItem>
                      <SelectItem value="Mastercard">Mastercard</SelectItem>
                      <SelectItem value="American Express">American Express</SelectItem>
                      <SelectItem value="Discover">Discover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiry_month">Mes</Label>
                    <Input
                      id="expiry_month"
                      placeholder="MM"
                      value={formData.expiry_month}
                      onChange={(e) => setFormData({ ...formData, expiry_month: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_year">Año</Label>
                    <Input
                      id="expiry_year"
                      placeholder="YYYY"
                      value={formData.expiry_year}
                      onChange={(e) => setFormData({ ...formData, expiry_year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      type="password"
                      value={formData.cvv}
                      onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddPaymentMethod}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {paymentMethods.length === 0 ? (
          <Card className="p-8 text-center">
            <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No tienes métodos de pago</h2>
            <p className="text-muted-foreground mb-6">Agrega una tarjeta para realizar compras más rápido</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Método
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <Card key={method.id} className={`p-6 ${method.is_default ? "border-2 border-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{method.card_brand || "Tarjeta"}</h3>
                        {method.is_default && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        •••• •••• •••• {method.last_four}
                      </p>
                      {method.expiry_month && method.expiry_year && (
                        <p className="text-xs text-muted-foreground">
                          Vence: {method.expiry_month}/{method.expiry_year}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Hacer Predeterminada
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(method.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentMethods;
