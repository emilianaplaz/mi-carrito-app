import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  name: string;
  brand?: string;
  quantity: number;
  price: number;
  unit: string;
  supermarket: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  loading: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up auth state listener and load cart
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
      if (session?.user) {
        loadCart(session.user.id);
      } else {
        setItems([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      if (session?.user) {
        loadCart(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCart = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: Omit<CartItem, "id">) => {
    if (!userId) return;

    try {
      // Check if item already exists
      const { data: existingItems } = await supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", userId)
        .eq("name", item.name)
        .eq("brand", item.brand || "")
        .eq("supermarket", item.supermarket);

      if (existingItems && existingItems.length > 0) {
        // Update quantity
        const existing = existingItems[0];
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);

        if (error) throw error;
        await loadCart(userId);
      } else {
        // Insert new item
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            name: item.name,
            brand: item.brand,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            supermarket: item.supermarket,
          });

        if (error) throw error;
        await loadCart(userId);
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const removeItem = async (id: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadCart(userId);
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (!userId) return;

    if (quantity <= 0) {
      await removeItem(id);
    } else {
      try {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity })
          .eq("id", id);

        if (error) throw error;
        await loadCart(userId);
      } catch (error) {
        console.error("Error updating quantity:", error);
      }
    }
  };

  const clearCart = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      setItems([]);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, loading }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
