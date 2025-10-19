import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Trash2, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import cartIcon from "@/assets/cart-icon.png";

export const CartButton = () => {
  const { items, totalItems } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <img src={cartIcon} alt="Cart" className="h-12 w-12 object-contain" />
          {totalItems > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mi Carrito</SheetTitle>
        </SheetHeader>
        <CartContent />
      </SheetContent>
    </Sheet>
  );
};

const CartContent = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <img src={cartIcon} alt="Cart" className="h-20 w-20 object-contain mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Tu carrito está vacío</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Agrega productos desde la lista de compras
        </p>
        <Button onClick={() => navigate("/listas")}>
          Ver Listas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {items.map((item) => (
        <div key={item.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold">{item.name}</h4>
              {item.brand && (
                <p className="text-xs text-muted-foreground">Marca: {item.brand}</p>
              )}
              <p className="text-xs text-muted-foreground">Tienda: {item.supermarket}</p>
              <p className="text-sm text-primary font-semibold mt-1">
                ${item.price.toFixed(2)} / {item.unit}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(item.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center font-semibold">{item.quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <p className="font-bold">${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        </div>
      ))}

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">${totalPrice.toFixed(2)}</span>
        </div>
        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate("/delivery-order")}
        >
          Proceder al Pago
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={clearCart}
        >
          Vaciar Carrito
        </Button>
      </div>
    </div>
  );
};
