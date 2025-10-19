import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ImportData = () => {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleImport = async () => {
    setImporting(true);
    try {
      // Fetch the CSV file
      const response = await fetch('/dataprecio_products.csv');
      const csvData = await response.text();

      // Call the import function
      const { data, error } = await supabase.functions.invoke('import-product-prices', {
        body: { csvData }
      });

      if (error) throw error;

      setTotal(data.total);
      setImported(true);
      toast({
        title: "¡Importación Exitosa!",
        description: `Se importaron ${data.total} productos correctamente`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron importar los productos",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-background to-secondary/10">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/listas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Importar Datos de Productos</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8">
          {!imported ? (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Importar Base de Datos de Productos
                </h2>
                <p className="text-muted-foreground">
                  Esta acción importará 8,553 productos desde el archivo CSV a la base de datos.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm text-left">
                <p className="font-semibold mb-2">⚠️ Advertencia:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Se eliminarán todos los productos existentes</li>
                  <li>Se importarán 8,553 nuevos productos</li>
                  <li>El proceso puede tardar 1-2 minutos</li>
                </ul>
              </div>

              <Button
                size="lg"
                onClick={handleImport}
                disabled={importing}
                className="w-full"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Importando productos...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-5 w-5" />
                    Iniciar Importación
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2 text-green-600">
                  ¡Importación Completada!
                </h2>
                <p className="text-muted-foreground">
                  Se importaron exitosamente {total.toLocaleString()} productos
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/listas")}
                  className="flex-1"
                >
                  Ir a Listas
                </Button>
                <Button
                  onClick={() => {
                    setImported(false);
                    setTotal(0);
                  }}
                  className="flex-1"
                >
                  Importar de Nuevo
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default ImportData;