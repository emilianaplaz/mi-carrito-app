import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Plus, Star, Trash2, ShoppingCart, Eye } from "lucide-react";

type GroceryItem = {
  name: string;
  brand: string;
};

type GroceryList = {
  id: string;
  name: string;
  items: GroceryItem[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

const Listas = () => {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newItems, setNewItems] = useState<GroceryItem[]>([{ name: "", brand: "" }]);
  const [viewingList, setViewingList] = useState<GroceryList | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserAndLoadLists = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadLists();
      setLoading(false);
    };
    checkUserAndLoadLists();
  }, [navigate]);

  const loadLists = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("grocery_lists")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading lists:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las listas",
        variant: "destructive",
      });
    } else {
      const formattedLists = (data || []).map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items as GroceryItem[] : []
      }));
      setLists(formattedLists);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la lista",
        variant: "destructive",
      });
      return;
    }

    const validItems = newItems.filter(item => item.name.trim() !== "");
    if (validItems.length === 0) {
      toast({
        title: "Error",
        description: "Por favor agrega al menos un artículo",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("grocery_lists").insert({
        user_id: session.user.id,
        name: newListName,
        items: validItems,
      });

      if (error) throw error;

      toast({
        title: "¡Lista creada!",
        description: "Tu lista ha sido guardada exitosamente",
      });

      setNewListName("");
      setNewItems([{ name: "", brand: "" }]);
      setIsDialogOpen(false);
      await loadLists();
    } catch (error) {
      console.error("Error creating list:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la lista",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addItemField = () => {
    setNewItems([...newItems, { name: "", brand: "" }]);
  };

  const updateItemField = (index: number, field: keyof GroceryItem, value: string) => {
    const updated = [...newItems];
    updated[index][field] = value;
    setNewItems(updated);
  };

  const removeItemField = (index: number) => {
    if (newItems.length > 1) {
      setNewItems(newItems.filter((_, i) => i !== index));
    }
  };

  const handleToggleFavorite = async (listId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from("grocery_lists")
        .update({ is_favorite: !currentFavorite })
        .eq("id", listId);

      if (error) throw error;

      setLists(lists.map(list => 
        list.id === listId ? { ...list, is_favorite: !currentFavorite } : list
      ));

      toast({
        title: !currentFavorite ? "Agregado a favoritos" : "Removido de favoritos",
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la lista",
        variant: "destructive",
      });
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la lista "${listName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("grocery_lists")
        .delete()
        .eq("id", listId);

      if (error) throw error;

      toast({
        title: "Lista eliminada",
        description: "La lista ha sido eliminada exitosamente",
      });

      await loadLists();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la lista",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Mis Listas</span>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Lista
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Lista</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="list-name">Nombre de la Lista</Label>
                  <Input
                    id="list-name"
                    placeholder="Ej: Compras de la semana"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Artículos</Label>
                  {newItems.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Nombre del producto"
                        value={item.name}
                        onChange={(e) => updateItemField(index, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Marca (opcional)"
                        value={item.brand}
                        onChange={(e) => updateItemField(index, "brand", e.target.value)}
                        className="flex-1"
                      />
                      {newItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItemField(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addItemField}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Artículo
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  setNewListName("");
                  setNewItems([{ name: "", brand: "" }]);
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateList} disabled={isCreating}>
                  {isCreating ? "Creando..." : "Crear Lista"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {lists.length === 0 ? (
          <Card className="p-8 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No tienes listas todavía</h2>
            <p className="text-muted-foreground mb-6">
              Crea tu primera lista de compras para empezar a organizarte
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Lista
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {lists.map((list) => (
              <Card key={list.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{list.name}</h3>
                      {list.is_favorite && (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Array.isArray(list.items) ? list.items.length : 0} {Array.isArray(list.items) && list.items.length === 1 ? "artículo" : "artículos"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creada el {new Date(list.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingList(list)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Artículos
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleFavorite(list.id, list.is_favorite)}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          list.is_favorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteList(list.id, list.name)}
                    >
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* View Items Dialog */}
      <Dialog open={!!viewingList} onOpenChange={(open) => !open && setViewingList(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingList?.name}</DialogTitle>
          </DialogHeader>
          
          {viewingList && Array.isArray(viewingList.items) && viewingList.items.length > 0 ? (
            <div className="space-y-2">
              {viewingList.items.map((item: GroceryItem, index: number) => (
                <Card
                  key={index}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setViewingList(null);
                    navigate(`/comprar-ingrediente?producto=${encodeURIComponent(item.name)}&lista=${viewingList.id}`);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      {item.brand && (
                        <p className="text-sm text-muted-foreground">Marca: {item.brand}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver Precios →
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Esta lista no tiene artículos
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Listas;
