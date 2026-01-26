import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoalsConfig, useSaveGoalsConfig } from "@/hooks/useGoalsConfig";
import { useHolidays } from "@/hooks/useHolidays";
import { useGenerateDailySales } from "@/hooks/useDailySales";
import { formatCurrency, generateWorkDays, calculateDailyGoals } from "@/lib/goalCalculations";
import { Save, Target, Calendar, Info, TrendingUp } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

export default function Settings() {
  const { data: config, isLoading } = useGoalsConfig();
  const { data: holidays = [] } = useHolidays();
  const saveConfig = useSaveGoalsConfig();
  const generateSales = useGenerateDailySales();

  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    min_goal: "",
    max_goal: "",
  });

  useEffect(() => {
    if (config) {
      setFormData({
        start_date: config.start_date,
        end_date: config.end_date,
        min_goal: String(config.min_goal),
        max_goal: String(config.max_goal),
      });
    }
  }, [config]);

  const handleSave = async () => {
    const configData = {
      start_date: formData.start_date,
      end_date: formData.end_date,
      min_goal: parseFloat(formData.min_goal) || 0,
      max_goal: parseFloat(formData.max_goal) || 0,
    };

    await saveConfig.mutateAsync(configData);

    // Generate daily sales
    const workDays = generateWorkDays(configData.start_date, configData.end_date, holidays);
    const dailyGoals = calculateDailyGoals(workDays, configData.min_goal, configData.max_goal);

    const salesData = dailyGoals.map((day) => ({
      date: day.date,
      day_of_week: day.dayOfWeek,
      min_goal: day.minGoal,
      max_goal: day.maxGoal,
      sales_value: 0,
    }));

    generateSales.mutate(salesData);
  };

  // Preview calculation
  const previewWorkDays = formData.start_date && formData.end_date
    ? generateWorkDays(formData.start_date, formData.end_date, holidays)
    : [];
  
  const totalWeight = previewWorkDays.reduce((sum, day) => sum + day.weight, 0);
  const workingDays = previewWorkDays.filter((d) => d.weight > 0).length;
  const totalDays = formData.start_date && formData.end_date
    ? differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1
    : 0;

  const dailyMinGoal = totalWeight > 0 ? (parseFloat(formData.min_goal) || 0) / totalWeight : 0;
  const dailyMaxGoal = totalWeight > 0 ? (parseFloat(formData.max_goal) || 0) / totalWeight : 0;

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
        {/* Period Card */}
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
                <Label htmlFor="start_date">Data Inicial</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Data Final</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
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

        {/* Goals Card */}
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
                <Label htmlFor="max_goal">Meta Máxima (R$)</Label>
                <Input
                  id="max_goal"
                  type="number"
                  placeholder="0.00"
                  value={formData.max_goal}
                  onChange={(e) =>
                    setFormData({ ...formData, max_goal: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_goal">Meta Mínima (R$)</Label>
                <Input
                  id="min_goal"
                  type="number"
                  placeholder="0.00"
                  value={formData.min_goal}
                  onChange={(e) =>
                    setFormData({ ...formData, min_goal: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
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
                <div className="p-4 bg-warning/10 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Meta Diária Mín.
                  </p>
                  <p className="text-2xl font-bold text-warning mt-1">
                    {formatCurrency(dailyMinGoal)}
                  </p>
                  <p className="text-xs text-muted-foreground">por dia cheio</p>
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="stat-card bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-2">Regras de Cálculo</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Dias úteis (Seg-Sex):</strong> 100% da meta diária</li>
                  <li>• <strong>Sábados:</strong> 50% da meta diária</li>
                  <li>• <strong>Domingos:</strong> Não contam no cálculo</li>
                  <li>• <strong>Feriados trabalhados:</strong> 50% da meta diária</li>
                  <li>• <strong>Feriados não trabalhados:</strong> Abatidos do cálculo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saveConfig.isPending || !formData.start_date || !formData.end_date}
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
