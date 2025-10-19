import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, ArrowLeft, Calendar as CalendarIcon, Clock, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/mi-carrit-logo.png";
import loadingCart from "@/assets/loading-cart.png";
import { CartButton } from "@/components/Cart";
import { BCVRate } from "@/components/BCVRate";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addDays, addWeeks, isWithinInterval, isBefore, isAfter, getDay, startOfWeek } from "date-fns";
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

      // Load ALL automated lists, not just those in current month
      const { data, error } = await supabase
        .from("grocery_lists")
        .select("id, name, next_scheduled_date, automation_frequency, items, last_executed_date")
        .eq("user_id", session.user.id)
        .eq("is_automated", true)
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

  // Calculate all occurrences of a list within the current month based on frequency
  const getListOccurrencesInMonth = (list: AutomatedList) => {
    const occurrences: Date[] = [];
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    if (!list.next_scheduled_date || !list.automation_frequency) return occurrences;
    
    let currentDate = parseISO(list.next_scheduled_date);
    
    // If next_scheduled_date is after the month, check if there were previous occurrences
    // by going backwards from next_scheduled_date
    if (isAfter(currentDate, monthEnd)) {
      let backwardDate = currentDate;
      while (isAfter(backwardDate, monthStart)) {
        if (list.automation_frequency === "weekly") {
          backwardDate = addDays(backwardDate, -7);
        } else if (list.automation_frequency === "bi-weekly") {
          backwardDate = addDays(backwardDate, -14);
        } else if (list.automation_frequency === "monthly") {
          backwardDate = addDays(backwardDate, -30);
        } else if (list.automation_frequency === "buy_once") {
          break; // No recurrence for buy_once
        }
        
        if (isWithinInterval(backwardDate, { start: monthStart, end: monthEnd })) {
          occurrences.push(backwardDate);
        }
      }
      return occurrences.sort((a, b) => a.getTime() - b.getTime());
    }
    
    // Add occurrences starting from next_scheduled_date and going forward
    while (isBefore(currentDate, monthEnd) || isSameDay(currentDate, monthEnd)) {
      if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
        occurrences.push(currentDate);
      }
      
      // Calculate next occurrence based on frequency
      if (list.automation_frequency === "weekly") {
        currentDate = addDays(currentDate, 7);
      } else if (list.automation_frequency === "bi-weekly") {
        currentDate = addDays(currentDate, 14);
      } else if (list.automation_frequency === "monthly") {
        currentDate = addDays(currentDate, 30);
      } else if (list.automation_frequency === "buy_once") {
        break; // Only one occurrence
      } else {
        break; // Unknown frequency
      }
    }
    
    return occurrences;
  };

  const getListsForDay = (day: Date) => {
    const listsForThisDay: AutomatedList[] = [];
    
    automatedLists.forEach(list => {
      const occurrences = getListOccurrencesInMonth(list);
      if (occurrences.some(occurrence => isSameDay(occurrence, day))) {
        listsForThisDay.push(list);
      }
    });
    
    return listsForThisDay;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });
  
  // Calculate empty cells needed before the first day
  const firstDayOfMonth = getDay(monthStart); // 0 = Sunday, 1 = Monday, etc.
  const emptyCells = Array(firstDayOfMonth).fill(null);

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
      case "buy_once":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const frequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "Semanal";
      case "bi-weekly":
        return "Quincenal";
      case "monthly":
        return "Mensual";
      case "buy_once":
        return "Una Vez";
      default:
        return frequency;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src={loadingCart} alt="Loading" className="w-32 h-auto object-contain animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">Calendario de Listas</span>
            </div>
            <BCVRate />
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2">
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

            {/* Empty cells before first day of month */}
            {emptyCells.map((_, index) => (
              <div key={`empty-${index}`} className="p-2 min-h-[100px]" />
            ))}
            
            {/* Calendar Days */}
            {daysInMonth.map((day) => {
              const listsForDay = getListsForDay(day);
              const today = new Date();
              const isToday = isSameDay(day, today);

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
                          {frequencyLabel(list.automation_frequency)}
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
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm">Una Vez</span>
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
                      {frequencyLabel(list.automation_frequency)}
                    </Badge>
                  </div>
                  <ShoppingCart className="h-5 w-5 ml-4 opacity-50" />
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
