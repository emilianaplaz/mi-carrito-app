import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Plus, Star, Trash2, ShoppingCart, Eye, Edit2 } from "lucide-react";

type GroceryItem = {
  name: string;
  brand: string;
  amount?: string;
  unit?: string;
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
  const [editingList, setEditingList] = useState<GroceryList | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [productBrands, setProductBrands] = useState<Map<string, string[]>>(new Map());
  const [productSearchResults, setProductSearchResults] = useState<string[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
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

  // Debounce product search input
  useEffect(() => {
    const t = setTimeout(() => {
      if (productSearchQuery.length >= 2) {
        searchProducts(productSearchQuery);
      } else {
        setProductSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearchQuery]);

  const searchProducts = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setProductSearchResults([]);
      return;
    }

    setIsSearchingProducts(true);
    try {
      const typed = (searchTerm || "").trim();

      // Fetch matching products from backend using exact literal substring (case-insensitive)
      const { data, error } = await supabase
        .from("product_prices")
        .select("producto")
        .ilike("producto", `%${typed}%`)
        .limit(500);

      if (error) throw error;

      // Deduplicate and enforce exact literal containment of the typed text
      const lowerTyped = typed.toLowerCase();
      const uniqueProducts = new Set<string>();
      (data || []).forEach((row: any) => {
        const p = row.producto as string;
        if (p && p.toLowerCase().includes(lowerTyped)) {
          uniqueProducts.add(p);
        }
      });

      setProductSearchResults(Array.from(uniqueProducts).sort().slice(0, 50));
    } catch (error) {
      console.error("Error searching products:", error);
      toast({
        title: "Error",
        description: "No se pudieron buscar productos",
        variant: "destructive",
      });
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const loadBrandsForProduct = async (productName: string) => {
    // If already loaded, skip
    if (productBrands.has(productName)) return;

    try {
      const { data, error } = await supabase
        .from("product_prices")
        .select("marca")
        .eq("producto", productName);

      if (error) throw error;

      const brands = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.marca) brands.add(row.marca);
      });

      setProductBrands(prev => new Map(prev).set(productName, Array.from(brands).sort()));
    } catch (error) {
      console.error("Error loading brands:", error);
    }
  };


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
    if (field === "name") {
      updated[index].name = value;
      // Reset brand when product changes to avoid invalid brand selection
      updated[index].brand = "";
      // Load brands for this product
      if (value) {
        loadBrandsForProduct(value);
      }
    } else {
      (updated[index] as any)[field] = value;
    }
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

  const handleEditList = (list: GroceryList) => {
    setEditingList(list);
    setNewListName(list.name);
    setNewItems(list.items.length > 0 ? list.items : [{ name: "", brand: "" }]);
    setIsEditDialogOpen(true);
  };

  const handleUpdateList = async () => {
    if (!editingList) return;
    
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
      const { error } = await supabase
        .from("grocery_lists")
        .update({
          name: newListName,
          items: validItems,
        })
        .eq("id", editingList.id);

      if (error) throw error;

      toast({
        title: "¡Lista actualizada!",
        description: "Tu lista ha sido actualizada exitosamente",
      });

      setNewListName("");
      setNewItems([{ name: "", brand: "" }]);
      setIsEditDialogOpen(false);
      setEditingList(null);
      await loadLists();
    } catch (error) {
      console.error("Error updating list:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la lista",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
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
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "flex-1 justify-between",
                                !item.name && "text-muted-foreground"
                              )}
                            >
                              {item.name || "Seleccionar producto..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 z-50 bg-popover" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Buscar producto..." 
                                onValueChange={(search) => setProductSearchQuery(search)}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {isSearchingProducts ? "Buscando..." : "Escribe para buscar productos"}
                                </CommandEmpty>
                                <CommandGroup>
                                  {productSearchResults.map((product) => (
                                    <CommandItem
                                      key={product}
                                      value={product}
                                      onSelect={() => updateItemField(index, "name", product)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.name === product ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {product}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Popover onOpenChange={(open) => {
                          if (open && item.name) {
                            loadBrandsForProduct(item.name);
                          }
                        }}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!item.name}
                              className={cn(
                                "flex-1 justify-between",
                                !item.brand && "text-muted-foreground"
                              )}
                            >
                              {item.brand || "Marca (opcional)"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar marca..." />
                              <CommandList>
                                <CommandEmpty>No se encontró la marca.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="ANY"
                                    onSelect={() => updateItemField(index, "brand", "")}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        !item.brand ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    CUALQUIER MARCA
                                  </CommandItem>
                                  {(productBrands.get(item.name) || []).map((brand) => (
                                    <CommandItem
                                      key={brand}
                                      value={brand}
                                      onSelect={() => updateItemField(index, "brand", brand)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.brand === brand ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {brand}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

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
              <Card 
                key={list.id} 
                className="p-6 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/comprar-lista?id=${list.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{list.name}</h3>
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
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingList(list)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Artículos
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditList(list)}
                    >
                      <Edit2 className="h-4 w-4" />
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
                      <div className="flex items-baseline gap-2">
                        <h4 className="font-semibold">{item.name}</h4>
                        {item.amount && item.unit && (
                          <span className="text-sm text-muted-foreground">
                            {item.amount} {item.unit}
                          </span>
                        )}
                      </div>
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

      {/* Edit List Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingList(null);
          setNewListName("");
          setNewItems([{ name: "", brand: "" }]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-list-name">Nombre de la Lista</Label>
              <Input
                id="edit-list-name"
                placeholder="Ej: Compras de la semana"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Artículos</Label>
              {newItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "flex-1 justify-between",
                          !item.name && "text-muted-foreground"
                        )}
                      >
                        {item.name || "Seleccionar producto..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 z-50 bg-popover" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Buscar producto..." 
                          onValueChange={(search) => setProductSearchQuery(search)}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isSearchingProducts ? "Buscando..." : "Escribe para buscar productos"}
                          </CommandEmpty>
                          <CommandGroup>
                            {productSearchResults.map((product) => (
                              <CommandItem
                                key={product}
                                value={product}
                                onSelect={() => updateItemField(index, "name", product)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.name === product ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {product}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Popover onOpenChange={(open) => {
                    if (open && item.name) {
                      loadBrandsForProduct(item.name);
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={!item.name}
                        className={cn(
                          "flex-1 justify-between",
                          !item.brand && "text-muted-foreground"
                        )}
                      >
                        {item.brand || "Marca (opcional)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar marca..." />
                        <CommandList>
                          <CommandEmpty>No se encontró la marca.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="ANY"
                              onSelect={() => updateItemField(index, "brand", "")}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !item.brand ? "opacity-100" : "opacity-0"
                                )}
                              />
                              CUALQUIER MARCA
                            </CommandItem>
                            {(productBrands.get(item.name) || []).map((brand) => (
                              <CommandItem
                                key={brand}
                                value={brand}
                                onSelect={() => updateItemField(index, "brand", brand)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.brand === brand ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {brand}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

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
              setIsEditDialogOpen(false);
              setEditingList(null);
              setNewListName("");
              setNewItems([{ name: "", brand: "" }]);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateList} disabled={isCreating}>
              {isCreating ? "Actualizando..." : "Actualizar Lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Listas;
