import { useState, useEffect } from "react";
import { MainLayout } from "../components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useGoalsConfig, useSaveGoalsConfig } from "../hooks/useGoalsConfig";
import { useHolidays } from "../hooks/useHolidays";
import { useGenerateDailySales, useDailySales } from "../hooks/useDailySales";
import { formatCurrency, generateWorkDays, calculateDailyGoals } from "../lib/goalCalculations";
import { Save, Target, Calendar, Info, TrendingUp } from "lucide-react";
import { parseISO, differenceInDays, isAfter, parseISO as parse } from "date-fns";

function getDayWeight(dayOfWeek: string): number {
  if (dayOfWeek === "Sáb") return 0.5;
  if (dayOfWeek === "Dom") return 0;
  return 1;
}

export default function Settings() {
  const { data: config, isLoading } = useGoalsConfig();
  const { data: holidays = [] } = useHolidays();
  const { data: existingSales = [] } = useDailySales();
  const saveConfig = useSaveGoalsConfig();
  const generateSales = useGenerateDailySales();

  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    minGoal: "",
    maxGoal: "",
  });

  useEffect(() => {
    if (config) {
      setFormData({
        startDate: config.startDate,
        endDate: config.endDate,
        maxGoal: String(config.maxGoal),
        minGoal: String(config.minGoal),
      });
    }
  }, [config]);

  const handleSave = async () => {
    const configData = {
      startDate: formData.startDate,
      endDate: formData.endDate,
      maxGoal: formData.maxGoal,
      minGoal: formData.minGoal,
    };

    await saveConfig.mutateAsync(configData);

    const workDays = generateWorkDays(configData.startDate, configData.endDate, holidays);
    
    // Create a map of existing sales by date
    const existingSalesMap = new Map<string, { salesValue: string }>();
    existingSales.forEach(sale => {
      existingSalesMap.set(sale.date, { salesValue: sale.salesValue });
    });

    const totalMinGoal = parseFloat(configData.minGoal) || 0;
    const totalMaxGoal = parseFloat(configData.maxGoal) || 0;

    // Sort workDays by date and filter only days with weight > 0
    // (excludes Sundays and non-worked holidays)
    const sortedDays = [...workDays]
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .filter(day => day.weight > 0);

    // Calculate total weight of all days for proportional distribution
    const totalWeight = sortedDays.reduce((sum, d) => sum + d.weight, 0);

    const salesData: { date: string; dayOfWeek: string; minGoal: string; maxGoal: string; salesValue: string }[] = [];

    // For each day, calculate the goal based on accumulated sales up to the PREVIOUS day
    // This ensures each day's goal reflects what's left to achieve after previous days' sales
    let accumulatedSales = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      const existingSale = existingSalesMap.get(day.date);
      const salesValue = existingSale ? existingSale.salesValue : "0";
      const salesAmount = parseFloat(salesValue) || 0;

      const weight = day.weight;
      let minGoal = 0;
      let maxGoal = 0;

      // Calculate remaining goal after previous days' sales
      const remainingMinGoal = Math.max(0, totalMinGoal - accumulatedSales);
      const remainingMaxGoal = Math.max(0, totalMaxGoal - accumulatedSales);

      // Calculate weight of remaining days (from current day onwards)
      const remainingDays = sortedDays.slice(i);
      const remainingWeight = remainingDays.reduce((sum, d) => sum + d.weight, 0);

      if (remainingWeight > 0) {
        // Distribute remaining goal proportionally among remaining days
        minGoal = Math.round((remainingMinGoal / remainingWeight) * weight * 100) / 100;
        maxGoal = Math.round((remainingMaxGoal / remainingWeight) * weight * 100) / 100;
      }

      salesData.push({
        date: day.date,
        dayOfWeek: day.dayOfWeekShort,
        minGoal: minGoal.toString(),
        maxGoal: maxGoal.toString(),
        salesValue,
      });

      // Only accumulate sales if there's an actual value > 0
      if (salesAmount > 0) {
        accumulatedSales += salesAmount;
      }
    }

    generateSales.mutate(salesData);
  };

  const previewWorkDays = formData.startDate && formData.endDate
    ? generateWorkDays(formData.startDate, formData.endDate, holidays)
    : [];
  
  const totalWeight = previewWorkDays.reduce((sum, day) => sum + day.weight, 0);
  const workingDays = previewWorkDays.filter((d) => d.weight > 0).length;
  const totalDays = formData.startDate && formData.endDate
    ? differenceInDays(parseISO(formData.endDate), parseISO(formData.startDate)) + 1
    : 0;

  const dailyMaxGoal = totalWeight > 0 ? (parseFloat(formData.maxGoal) || 0) / totalWeight : 0;
  const dailyMinGoal = totalWeight > 0 ? (parseFloat(formData.minGoal) || 0) / totalWeight : 0;

  if (isLoading) {
    return (
      <MainLayout title="Configurações">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Configurações">
      <div className="max-w-4xl space-y-6 animate-fade-in">
        <Card className="stat-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Período de Trabalho</CardTitle>
                <CardDescription>
                  Defina o período para cálculo das metas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  data-testid="input-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  data-testid="input-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            {totalDays > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>{totalDays}</strong> dias no período, sendo{" "}
                  <strong>{workingDays}</strong> dias úteis de trabalho
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="text-lg">Metas de Vendas</CardTitle>
                <CardDescription>
                  Configure os valores de meta mínima e máxima do período
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxGoal">Meta Máxima (R$)</Label>
                <Input
                  id="maxGoal"
                  data-testid="input-max-goal"
                  type="number"
                  placeholder="0.00"
                  value={formData.maxGoal}
                  onChange={(e) =>
                    setFormData({ ...formData, maxGoal: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minGoal">Meta Mínima (R$)</Label>
                <Input
                  id="minGoal"
                  data-testid="input-min-goal"
                  type="number"
                  placeholder="0.00"
                  value={formData.minGoal}
                  onChange={(e) =>
                    setFormData({ ...formData, minGoal: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {totalWeight > 0 && (
          <Card className="stat-card border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Prévia do Cálculo</CardTitle>
                  <CardDescription>
                    Com base nas configurações atuais
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Peso Total
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {totalWeight.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">dias equivalentes</p>
                </div>
                <div className="p-4 bg-success/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Meta Diária Máx.
                  </p>
                  <p className="text-2xl font-bold text-success mt-1">
                    {formatCurrency(dailyMaxGoal)}
                  </p>
                  <p className="text-xs text-muted-foreground">por dia cheio</p>
                </div>
                <div className="p-4 bg-warning/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Meta Diária Mín.
                  </p>
                  <p className="text-2xl font-bold text-warning mt-1">
                    {formatCurrency(dailyMinGoal)}
                  </p>
                  <p className="text-xs text-muted-foreground">por dia cheio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="stat-card bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-2">Regras de Cálculo</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Dias úteis (Seg-Sex): 100% da meta diária</li>
                  <li>Sábados: 50% da meta diária</li>
                  <li>Domingos: Não contam no cálculo</li>
                  <li>Feriados trabalhados: 50% da meta diária</li>
                  <li>Feriados não trabalhados: Abatidos do cálculo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            data-testid="button-save-settings"
            disabled={saveConfig.isPending || !formData.startDate || !formData.endDate}
            size="lg"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveConfig.isPending ? "Salvando..." : "Salvar e Gerar Dias"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
