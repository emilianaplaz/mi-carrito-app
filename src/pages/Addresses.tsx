import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MapPin, Trash2, Star, Calendar, ChefHat, Settings, Plus } from "lucide-react";
import { CartButton } from "@/components/Cart";
import { BCVRate } from "@/components/BCVRate";
import logo from "@/assets/mi-carrit-logo.png";

type Address = { title?: string; street: string; zone: string; zipCode: string; is_default?: boolean };

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

const CARACAS_ZIP_CODES = ["1010", "1050", "1060", "1070", "1080"];

const STORAGE_KEY = "saved_addresses";

const Addresses = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [title, setTitle] = useState("");
  const [street, setStreet] = useState("");
  const [zone, setZone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: Address[] = raw ? JSON.parse(raw) : [];
      setAddresses(list);
    } catch {}
  }, []);

  const saveToStorage = (list: Address[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    setAddresses(list);
  };

  const handleAdd = () => {
    if (!street.trim() || !zone || !zipCode) return;
    const newAddr: Address = { title: title.trim() || undefined, street: street.trim(), zone, zipCode };
    const exists = addresses.some(a => a.street === newAddr.street && a.zone === newAddr.zone && a.zipCode === newAddr.zipCode && (a.title || "") === (newAddr.title || ""));
    if (exists) {
      setIsAdding(false);
      setStreet("");
      setZone("");
      setZipCode("");
      return;
    }
    const updated = [newAddr, ...addresses].slice(0, 20);
    saveToStorage(updated);
    setIsAdding(false);
    setTitle("");
    setStreet("");
    setZone("");
    setZipCode("");
  };

  const handleDelete = (idx: number) => {
    const updated = addresses.filter((_, i) => i !== idx);
    saveToStorage(updated);
  };

  const handleSetDefault = (idx: number) => {
    const updated = addresses.map((a, i) => ({ ...a, is_default: i === idx }));
    saveToStorage(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/delivery-order")}> 
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Direcciones</span>
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Tus Direcciones</h1>
          <Button onClick={() => setIsAdding(v => !v)}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Dirección
          </Button>
        </div>

        {isAdding && (
          <Card className="p-6 mb-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input id="title" placeholder="Ej: Casa, Oficina" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="street">Calle y Número</Label>
                <Input id="street" placeholder="Ej: Av. Francisco de Miranda, Edif. Torre Europa" value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zone">Zona</Label>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger id="zone">
                      <SelectValue placeholder="Selecciona zona" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARACAS_ZONES.map((z) => (
                        <SelectItem key={z} value={z}>{z}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="zip">Código Postal</Label>
                  <Select value={zipCode} onValueChange={setZipCode}>
                    <SelectTrigger id="zip">
                      <SelectValue placeholder="Selecciona código postal" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARACAS_ZIP_CODES.map((zip) => (
                        <SelectItem key={zip} value={zip}>{zip}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancelar</Button>
                <Button onClick={handleAdd}>Guardar</Button>
              </div>
            </div>
          </Card>
        )}

        {addresses.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No tienes direcciones guardadas</h2>
            <p className="text-muted-foreground mb-6">Agrega una dirección para acelerar tus pedidos</p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Dirección
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {addresses.map((addr, idx) => (
              <Card key={idx} className={`p-6 ${addr.is_default ? "border-2 border-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">{addr.title ? `${addr.title} · ` : ''}{addr.street}</p>
                      <p className="text-sm text-muted-foreground">{addr.zone} · {addr.zipCode} · Caracas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!addr.is_default && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(idx)}>
                        <Star className="h-4 w-4 mr-1" /> Predeterminada
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(idx)}>
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

export default Addresses;

