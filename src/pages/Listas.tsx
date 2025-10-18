import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Plus, Star, Trash2, ShoppingCart } from "lucide-react";

type GroceryList = {
  id: string;
  name: string;
  items: any;
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
      setLists(data || []);
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

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("grocery_lists").insert({
        user_id: session.user.id,
        name: newListName,
        items: [],
      });

      if (error) throw error;

      toast({
        title: "¡Lista creada!",
        description: "Tu lista ha sido guardada exitosamente",
      });

      setNewListName("");
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
            <DialogContent>
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
                    onKeyPress={(e) => e.key === "Enter" && handleCreateList()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
    </div>
  );
};

export default Listas;
