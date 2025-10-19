import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ImportPrices = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; total?: number } | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Fetch the CSV file from public folder
      const response = await fetch('/dataprecio_products.csv');
      const csvData = await response.text();

      console.log('CSV file loaded, total lines:', csvData.split('\n').length);

      // Call the edge function to import
      const { data, error } = await supabase.functions.invoke('import-product-prices', {
        body: { csvData }
      });

      if (error) throw error;

      setResult({
        success: true,
        message: data.message,
        total: data.total
      });

      toast({
        title: "¡Importación exitosa!",
        description: `${data.total} productos importados correctamente`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      setResult({
        success: false,
        message: error.message || 'Error desconocido durante la importación'
      });

      toast({
        title: "Error",
        description: error.message || 'No se pudo importar los precios',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <ChefHat className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold mb-2">Importar Precios de Productos</h1>
          <p className="text-muted-foreground text-center">
            Importa los precios de productos desde el archivo CSV actualizado
          </p>
        </div>

        <div className="space-y-6">
          <Card className="p-4 bg-muted">
            <h3 className="font-semibold mb-2">Información del archivo:</h3>
            <p className="text-sm text-muted-foreground">
              Archivo: <code className="bg-background px-2 py-1 rounded">public/dataprecio_products.csv</code>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Este proceso eliminará todos los precios existentes y los reemplazará con los nuevos datos.
            </p>
          </Card>

          <Button 
            onClick={handleImport} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Importar Precios Ahora
              </>
            )}
          </Button>

          {result && (
            <Card className={`p-4 ${result.success ? 'bg-primary border-primary' : 'bg-destructive border-destructive'}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-primary-foreground flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${result.success ? 'text-primary-foreground' : 'text-destructive-foreground'}`}>
                    {result.success ? 'Importación Completada' : 'Error en la Importación'}
                  </h4>
                  <p className={`text-sm ${result.success ? 'text-primary-foreground' : 'text-destructive-foreground'}`}>
                    {result.message}
                  </p>
                  {result.total && (
                    <p className={`text-sm mt-2 font-medium ${result.success ? 'text-primary-foreground' : 'text-destructive-foreground'}`}>
                      Total de productos: {result.total}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ImportPrices;
