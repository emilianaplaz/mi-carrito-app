import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, MapPin, Clock, CreditCard, Loader2, CheckCircle, Calendar, ChefHat, Settings } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CartButton } from "@/components/Cart";
import logo from "@/assets/mi-carrit-logo.png";

type CartItem = {
  name: string;
  quantity: number;
  price: number;
  unit: string;
};

type SavedPaymentMethod = {
  id: string;
  type: string;
  last_four?: string;
  card_brand?: string;
  is_default: boolean;
};

// Caracas zones for dropdown
const CARACAS_ZONES = [
  "Chacao",
  "Sabana Grande",
  "Altamira",
  "Las Mercedes",
  "El Cafetal",
  "Los Palos Grandes",
  "La California",
  "El Recreo",
  "Baruta",
  "El Hatillo",
  "Los Cortijos",
  "Macaracuay",
];

// Caracas ZIP codes
const CARACAS_ZIP_CODES = ["1010", "1050", "1060", "1070", "1080"];

const DeliveryOrder = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: cartItems, clearCart } = useCart();

  useEffect(() => {
    if (cartItems.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "No hay productos en el carrito",
        variant: "destructive",
      });
      navigate("/listas");
    }
  }, []);

  // Form state
  const [street, setStreet] = useState("");
  const [zone, setZone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [selectedSavedCard, setSelectedSavedCard] = useState<string>("");
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Load saved payment methods
  useEffect(() => {
    loadSavedPaymentMethods();
  }, []);

  const loadSavedPaymentMethods = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("payment_methods")
        .select("id, type, last_four, card_brand, is_default")
        .eq("user_id", session.user.id)
        .order("is_default", { ascending: false });

      if (error) throw error;
      
      const methods = data || [];
      setSavedPaymentMethods(methods);
      
      // Auto-select default payment method
      const defaultMethod = methods.find(m => m.is_default);
      if (defaultMethod) {
        setSelectedSavedCard(defaultMethod.id);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryOption === "express" ? 3.0 : 1.5;
  const total = subtotal + deliveryFee;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!street.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa la dirección",
        variant: "destructive",
      });
      return;
    }

    if (!zone) {
      toast({
        title: "Error",
        description: "Por favor selecciona una zona de Caracas",
        variant: "destructive",
      });
      return;
    }

    if (!zipCode) {
      toast({
        title: "Error",
        description: "Por favor selecciona un código postal válido para Caracas",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "card" && (!cardNumber.trim() || !cardName.trim())) {
      toast({
        title: "Error",
        description: "Por favor completa los datos de pago",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Mock API call - Replace with real delivery API
    // Example: POST to https://api.caracas-delivery-provider.com/orders
    // Body: { items: cartItems, address: { street, city: 'Caracas', zone, zipCode }, deliveryOption, payment: { cardNumber, cardName } }
    
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock successful response
      const mockOrderId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const mockEta = deliveryOption === "express" ? "1 hora" : "2-3 horas";

      setOrderId(mockOrderId);
      setOrderSuccess(true);
      clearCart();

      toast({
        title: "¡Pedido confirmado!",
        description: `Tu pedido llegará en ${mockEta}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el pedido. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">¡Pedido Confirmado!</h2>
          <p className="text-muted-foreground mb-4">
            Tu pedido <span className="font-mono font-semibold">{orderId}</span> ha sido procesado exitosamente.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm">
              <strong>Tiempo estimado:</strong> {deliveryOption === "express" ? "1 hora" : "2-3 horas"}
            </p>
            <p className="text-sm">
              <strong>Destino:</strong> {zone}, Caracas
            </p>
            <p className="text-sm">
              <strong>Total:</strong> ${total.toFixed(2)}
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            Volver al Dashboard
          </Button>
        </Card>
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
              <img src={logo} alt="MiCarrit" className="h-6 w-6 object-contain" />
              <span className="text-lg font-bold">Delivery en Caracas</span>
            </div>
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Summary - Left Column on Desktop */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <img src={logo} alt="MiCarrit" className="h-6 w-6 object-contain" />
                  Resumen del Pedido
                </h2>
                <div className="space-y-3 mb-4">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm border-b pb-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.quantity} × ${item.price.toFixed(2)} / {item.unit}
                        </p>
                      </div>
                      <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Envío</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">${total.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Forms - Right Columns on Desktop */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Address */}
              <Card className="p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Dirección de Entrega
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Servicio disponible solo en Caracas, Venezuela
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="street">Calle y Número</Label>
                    <Input
                      id="street"
                      placeholder="Ej: Av. Francisco de Miranda, Edif. Torre Europa"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zone">Zona</Label>
                      <Select value={zone} onValueChange={setZone} required>
                        <SelectTrigger id="zone">
                          <SelectValue placeholder="Selecciona zona" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARACAS_ZONES.map((z) => (
                            <SelectItem key={z} value={z}>
                              {z}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="city">Ciudad</Label>
                      <Input id="city" value="Caracas" disabled className="bg-muted" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="zipCode">Código Postal</Label>
                    <Select value={zipCode} onValueChange={setZipCode} required>
                      <SelectTrigger id="zipCode">
                        <SelectValue placeholder="Selecciona código postal" />
                      </SelectTrigger>
                      <SelectContent>
                        {CARACAS_ZIP_CODES.map((zip) => (
                          <SelectItem key={zip} value={zip}>
                            {zip}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Delivery Options */}
              <Card className="p-6 shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Opciones de Entrega
                </h2>
                <div className="space-y-3">
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      deliveryOption === "standard"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setDeliveryOption("standard")}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Estándar</p>
                        <p className="text-sm text-muted-foreground">2-3 horas</p>
                      </div>
                      <p className="font-bold text-primary">$1.50</p>
                    </div>
                  </div>
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      deliveryOption === "express"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setDeliveryOption("express")}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Express</p>
                        <p className="text-sm text-muted-foreground">1 hora</p>
                      </div>
                      <p className="font-bold text-primary">$3.00</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="p-6 shadow-lg">
                 <h2 className="text-xl font-bold mb-4 flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Método de Pago
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/payment-methods")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Gestionar
                  </Button>
                </h2>
                
                {/* Saved Payment Methods */}
                {savedPaymentMethods.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <Label>Tarjetas Guardadas</Label>
                    {savedPaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedSavedCard === method.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setSelectedSavedCard(method.id);
                          setPaymentMethod("saved");
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5" />
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                {method.card_brand || "Tarjeta"} •••• {method.last_four}
                                {method.is_default && (
                                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                    Predeterminada
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Payment Method Selector */}
                <Label className="mb-3 block">O selecciona otro método</Label>
                <div className="space-y-3 mb-6">
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      paymentMethod === "card" && !selectedSavedCard
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      setPaymentMethod("card");
                      setSelectedSavedCard("");
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <div>
                        <p className="font-semibold">Tarjeta Nueva</p>
                        <p className="text-sm text-muted-foreground">Pago inmediato con tarjeta</p>
                      </div>
                    </div>
                  </div>
                  
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      paymentMethod === "cashea"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setPaymentMethod("cashea")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold">C</span>
                      </div>
                      <div>
                        <p className="font-semibold">Cashea</p>
                        <p className="text-sm text-muted-foreground">Compra ahora, paga después</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit Card Form - Only show if card is selected and no saved card */}
                {paymentMethod === "card" && !selectedSavedCard && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Número de Tarjeta</Label>
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        maxLength={19}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cardName">Nombre en la Tarjeta</Label>
                        <Input
                          id="cardName"
                          placeholder="Juan Pérez"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cardExpiry">Vencimiento</Label>
                        <Input id="cardExpiry" type="text" placeholder="MM/AA" maxLength={5} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cardCVV">CVV</Label>
                        <Input id="cardCVV" type="text" placeholder="123" maxLength={3} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Cashea Info - Only show if cashea is selected */}
                {paymentMethod === "cashea" && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm">
                      Serás redirigido a Cashea para completar tu compra de forma segura.
                      Paga en cuotas flexibles sin tarjeta de crédito.
                    </p>
                  </div>
                )}
              </Card>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full text-lg py-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando pedido...
                  </>
                ) : (
                  <>
                    Confirmar Pedido - ${total.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default DeliveryOrder;
