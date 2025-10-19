import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChefHat, LogOut, Plus, Pencil, Trash2, ArrowLeft, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const categories = [
  "Frutas y Verduras",
  "Lácteos",
  "Carnes y Pescados",
  "Cereales y Granos",
  "Conservas",
  "Bebidas",
  "Condimentos",
  "Snacks",
  "Otros"
];

const units = ["unidad", "kg", "g", "l", "ml", "paquete", "lata", "botella"];

const Pantry = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    quantity: "1",
    unit: "unidad",
    category: "",
    expiry_date: "",
    notes: ""
  });
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
      fetchItems(session.user.id);
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

  const fetchItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      quantity: "1",
      unit: "unidad",
      category: "",
      expiry_date: "",
      notes: ""
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const itemData = {
        user_id: user.id,
        name: formData.name,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        category: formData.category || null,
        expiry_date: formData.expiry_date || null,
        notes: formData.notes || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("pantry_items")
          .update(itemData)
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Producto actualizado",
          description: "El producto se actualizó correctamente",
        });
      } else {
        const { error } = await supabase
          .from("pantry_items")
          .insert([itemData]);

        if (error) throw error;
        toast({
          title: "Producto agregado",
          description: "El producto se agregó a tu despensa",
        });
      }

      resetForm();
      setIsAddDialogOpen(false);
      if (user) fetchItems(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: PantryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      category: item.category || "",
      expiry_date: item.expiry_date || "",
      notes: item.notes || ""
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    try {
      const { error } = await supabase
        .from("pantry_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Producto eliminado",
        description: "El producto se eliminó de tu despensa",
      });
      
      if (user) fetchItems(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || "Sin categoría";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ChefHat className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">
                Mi Despensa
              </span>
            </div>
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
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Despensa</h1>
            <p className="text-muted-foreground">
              Administra tu inventario de alimentos
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-card z-[100]">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Producto" : "Agregar Producto"}
                </DialogTitle>
                <DialogDescription>
                  {editingItem 
                    ? "Actualiza la información del producto" 
                    : "Agrega un nuevo producto a tu despensa"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del producto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Arroz integral"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidad *</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger id="unit" className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border z-[150]">
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger id="category" className="bg-background">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border z-[150]">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Fecha de caducidad</Label>
                  <div className="relative">
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingItem ? "Actualizar" : "Agregar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {items.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-24 w-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Tu despensa está vacía</h3>
              <p className="text-muted-foreground mb-6">
                Comienza agregando productos para gestionar tu inventario
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Agregar Primer Producto
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  {category} ({categoryItems.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryItems.map((item) => {
                    const isExpiringSoon = item.expiry_date && 
                      new Date(item.expiry_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    const isExpired = item.expiry_date && 
                      new Date(item.expiry_date) < new Date();

                    return (
                      <Card 
                        key={item.id} 
                        className="p-4 hover:shadow-medium transition-all duration-300 relative"
                      >
                        {isExpired && (
                          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded">
                            Caducado
                          </div>
                        )}
                        {isExpiringSoon && !isExpired && (
                          <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                            Por vencer
                          </div>
                        )}
                        <h3 className="font-semibold text-lg mb-2 pr-20">{item.name}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground mb-4">
                          <p>
                            Cantidad: <span className="font-medium text-foreground">
                              {item.quantity} {item.unit}
                            </span>
                          </p>
                          {item.expiry_date && (
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Caduca: <span className={`font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-secondary' : 'text-foreground'}`}>
                                {new Date(item.expiry_date).toLocaleDateString()}
                              </span>
                            </p>
                          )}
                          {item.notes && (
                            <p className="italic">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="flex-1"
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Pantry;