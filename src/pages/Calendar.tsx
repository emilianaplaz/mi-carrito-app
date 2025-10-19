import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Calendar as CalendarIcon, Clock, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/mi-carrit-logo.png";
import { CartButton } from "@/components/Cart";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";

type AutomatedList = {
  id: string;
  name: string;
  next_scheduled_date: string;
  automation_frequency: string;
  items: any[];
};

const Calendar = () => {
  const [loading, setLoading] = useState(true);
  const [automatedLists, setAutomatedLists] = useState<AutomatedList[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAutomatedLists();
  }, [currentMonth]);

  const loadAutomatedLists = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from("grocery_lists")
        .select("id, name, next_scheduled_date, automation_frequency, items")
        .eq("user_id", session.user.id)
        .eq("is_automated", true)
        .gte("next_scheduled_date", start.toISOString())
        .lte("next_scheduled_date", end.toISOString())
        .order("next_scheduled_date", { ascending: true });

      if (error) throw error;
      setAutomatedLists((data || []).map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items : []
      })));
    } catch (error: any) {
      console.error("Error loading automated lists:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las listas automatizadas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getListsForDay = (day: Date) => {
    return automatedLists.filter((list) =>
      isSameDay(parseISO(list.next_scheduled_date), day)
    );
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const frequencyBadgeColor = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "bg-blue-500";
      case "bi-weekly":
        return "bg-purple-500";
      case "monthly":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CalendarIcon className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/listas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Calendario de Listas</span>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <img src={logo} alt="MiCarrit" className="h-28" />
          </div>
          <div className="flex items-center gap-2">
            <CartButton />
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ChefHat className="h-10 w-10" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={previousMonth}>
              ← Anterior
            </Button>
            <h2 className="text-2xl font-bold capitalize">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h2>
            <Button variant="outline" onClick={nextMonth}>
              Siguiente →
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <div key={day} className="text-center font-bold p-2 text-sm text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {daysInMonth.map((day) => {
              const listsForDay = getListsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <Card
                  key={day.toISOString()}
                  className={`p-2 min-h-[100px] ${
                    isToday ? "border-2 border-primary" : ""
                  } ${listsForDay.length > 0 ? "bg-primary/5" : ""}`}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {listsForDay.map((list) => (
                      <div
                        key={list.id}
                        className="text-xs p-1 rounded bg-card border cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/comprar-lista?id=${list.id}`)}
                      >
                        <div className="font-medium truncate">{list.name}</div>
                        <Badge
                          className={`text-xs ${frequencyBadgeColor(list.automation_frequency)}`}
                        >
                          {list.automation_frequency === "weekly"
                            ? "Semanal"
                            : list.automation_frequency === "bi-weekly"
                            ? "Quincenal"
                            : "Mensual"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm">Semanal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500"></div>
              <span className="text-sm">Quincenal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">Mensual</span>
            </div>
          </div>
        </Card>

        {/* Upcoming Automated Lists */}
        {automatedLists.length > 0 && (
          <Card className="p-6 mt-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Próximas Listas Automatizadas
            </h3>
            <div className="space-y-3">
              {automatedLists.slice(0, 5).map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/comprar-lista?id=${list.id}`)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{list.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {list.items?.length || 0} productos
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {format(parseISO(list.next_scheduled_date), "d MMM yyyy", { locale: es })}
                    </div>
                    <Badge className={frequencyBadgeColor(list.automation_frequency)}>
                      {list.automation_frequency === "weekly"
                        ? "Semanal"
                        : list.automation_frequency === "bi-weekly"
                        ? "Quincenal"
                        : "Mensual"}
                    </Badge>
                  </div>
                  <ShoppingCart className="h-5 w-5 ml-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Calendar;
