import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSellers,
  useCreateSeller,
  useUpdateSeller,
  useDeleteSeller,
  useSellerDailySales,
  useGenerateSellerSales,
  useClearSellerSales,
  type Seller,
} from "@/hooks/useSellers";
import { useGoalsConfig } from "@/hooks/useGoalsConfig";
import { useHolidays } from "@/hooks/useHolidays";
import { useRecalculateSellerGoals } from "@/hooks/useRecalculateSellerGoals";
import { formatCurrency, formatDate, generateWorkDays } from "@/lib/goalCalculations";
import { Plus, RefreshCw, AlertCircle, Trash2, Edit2, Check, X, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/sales/CurrencyInput";

export default function Sellers() {
  const [, setLocation] = useLocation();
  const { data: sellers = [], isLoading: loadingSellers } = useSellers();
  const { data: config } = useGoalsConfig();
  const { data: holidays = [] } = useHolidays();
  
  const createSeller = useCreateSeller();
  const updateSeller = useUpdateSeller();
  const deleteSeller = useDeleteSeller();
  const generateSales = useGenerateSellerSales();
  const clearSales = useClearSellerSales();
  const recalculateGoals = useRecalculateSellerGoals();

  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [newSellerName, setNewSellerName] = useState("");
  const [newSellerGoal, setNewSellerGoal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState(0);

  const { data: sellerSales = [], isLoading: loadingSales } = useSellerDailySales(selectedSellerId);
  const [editingValues, setEditingValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (sellers.length > 0 && !selectedSellerId) {
      setSelectedSellerId(sellers[0].id);
    }
  }, [sellers, selectedSellerId]);

  useEffect(() => {
    const values: Record<string, number> = {};
    sellerSales.forEach((s) => {
      values[s.id] = Number(s.salesValue);
    });
    setEditingValues(values);
  }, [sellerSales]);

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);

  const handleCreateSeller = () => {
    if (!newSellerName.trim()) return;
    createSeller.mutate(
      { name: newSellerName.trim(), goal: newSellerGoal.toString() },
      {
        onSuccess: () => {
          setNewSellerName("");
          setNewSellerGoal(0);
          setIsDialogOpen(false);
        },
      }
    );
  };

  const handleStartEdit = (seller: Seller) => {
    setEditingId(seller.id);
    setEditName(seller.name);
    setEditGoal(Number(seller.goal));
  };

  const regenerateSellerDaysWithNewGoal = (sellerId: string, sellerGoal: number) => {
    if (!config) return;
    
    const workDays = generateWorkDays(config.startDate, config.endDate, holidays);
    
    // Create a map of existing sales by date
    const existingSalesMap = new Map<string, { salesValue: string }>();
    sellerSales.forEach(sale => {
      existingSalesMap.set(sale.date, { salesValue: sale.salesValue });
    });

    // Sort and filter days with weight > 0
    const sortedDays = [...workDays]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(day => day.weight > 0);

    const salesData: { date: string; dayOfWeek: string; goal: string; salesValue: string }[] = [];
    let accumulatedSales = 0;

    // For each day, calculate goal based on accumulated sales up to the PREVIOUS day
    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      const existingSale = existingSalesMap.get(day.date);
      const salesValue = existingSale ? existingSale.salesValue : "0";
      const salesAmount = parseFloat(salesValue) || 0;

      // Calculate remaining goal after previous days' sales
      const remainingGoal = Math.max(0, sellerGoal - accumulatedSales);

      // Calculate weight of remaining days (from current day onwards)
      const remainingDays = sortedDays.slice(i);
      const remainingWeight = remainingDays.reduce((sum, d) => sum + d.weight, 0);

      let goal = 0;
      if (remainingWeight > 0) {
        goal = Math.round((remainingGoal / remainingWeight) * day.weight * 100) / 100;
      }

      salesData.push({
        date: day.date,
        dayOfWeek: day.dayOfWeekShort,
        goal: goal.toString(),
        salesValue,
      });

      // Only accumulate sales if there's an actual value > 0
      if (salesAmount > 0) {
        accumulatedSales += salesAmount;
      }
    }

    generateSales.mutate({ sellerId, sales: salesData });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const originalSeller = sellers.find(s => s.id === editingId);
    const goalChanged = originalSeller && Number(originalSeller.goal) !== editGoal;
    
    updateSeller.mutate(
      { id: editingId, name: editName.trim(), goal: editGoal.toString() },
      {
        onSuccess: () => {
          setEditingId(null);
          if (goalChanged && selectedSellerId === editingId) {
            regenerateSellerDaysWithNewGoal(editingId, editGoal);
          }
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteSeller = (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este vendedor e todas as suas vendas?")) return;
    deleteSeller.mutate(id, {
      onSuccess: () => {
        if (selectedSellerId === id) {
          setSelectedSellerId(sellers.find((s) => s.id !== id)?.id || null);
        }
      },
    });
  };

  const handleGenerateDays = () => {
    if (!selectedSellerId || !config || !selectedSeller) return;

    const workDays = generateWorkDays(config.startDate, config.endDate, holidays);
    const sellerGoal = Number(selectedSeller.goal);
    
    // Create a map of existing sales by date
    const existingSalesMap = new Map<string, { salesValue: string }>();
    sellerSales.forEach(sale => {
      existingSalesMap.set(sale.date, { salesValue: sale.salesValue });
    });

    // Sort and filter days with weight > 0
    const sortedDays = [...workDays]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(day => day.weight > 0);

    const salesData: { date: string; dayOfWeek: string; goal: string; salesValue: string }[] = [];
    let accumulatedSales = 0;

    // For each day, calculate goal based on accumulated sales up to the PREVIOUS day
    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      const existingSale = existingSalesMap.get(day.date);
      const salesValue = existingSale ? existingSale.salesValue : "0";
      const salesAmount = parseFloat(salesValue) || 0;

      // Calculate remaining goal after previous days' sales
      const remainingGoal = Math.max(0, sellerGoal - accumulatedSales);

      // Calculate weight of remaining days (from current day onwards)
      const remainingDays = sortedDays.slice(i);
      const remainingWeight = remainingDays.reduce((sum, d) => sum + d.weight, 0);

      let goal = 0;
      if (remainingWeight > 0) {
        goal = Math.round((remainingGoal / remainingWeight) * day.weight * 100) / 100;
      }

      salesData.push({
        date: day.date,
        dayOfWeek: day.dayOfWeekShort,
        goal: goal.toString(),
        salesValue,
      });

      // Only accumulate sales if there's an actual value > 0
      if (salesAmount > 0) {
        accumulatedSales += salesAmount;
      }
    }

    generateSales.mutate({ sellerId: selectedSellerId, sales: salesData });
  };

  const handleSalesValueChange = (id: string, newValue: number) => {
    setEditingValues((prev) => ({ ...prev, [id]: newValue }));
    if (selectedSellerId && selectedSeller) {
      recalculateGoals.mutate({
        saleId: id,
        newSalesValue: newValue.toString(),
        allSales: sellerSales,
        totalGoal: Number(selectedSeller.goal),
        sellerId: selectedSellerId,
      });
    }
  };

  const totalSales = useMemo(
    () => sellerSales.reduce((sum, s) => sum + Number(s.salesValue), 0),
    [sellerSales]
  );

  const totalGoal = Number(selectedSeller?.goal || 0);

  if (!config) {
    return (
      <MainLayout title="Vendedores">
        <Card className="stat-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-warning mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuração Necessária</h3>
            <p className="text-muted-foreground text-center mb-4">
              Você precisa configurar as metas e o período de trabalho antes de gerenciar vendedores.
            </p>
            <Button onClick={() => setLocation("/configuracoes")} data-testid="button-go-settings">
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Vendedores">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Label>Vendedor:</Label>
            <Select
              value={selectedSellerId || ""}
              onValueChange={(val) => setSelectedSellerId(val)}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-seller">
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-seller">
                <Plus className="h-4 w-4" />
                Novo Vendedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Vendedor</DialogTitle>
                <DialogDescription>
                  Adicione um novo vendedor com sua meta de vendas para o período.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="seller-name">Nome</Label>
                  <Input
                    id="seller-name"
                    value={newSellerName}
                    onChange={(e) => setNewSellerName(e.target.value)}
                    placeholder="Nome do vendedor"
                    data-testid="input-seller-name"
                  />
                </div>
                <div>
                  <Label htmlFor="seller-goal">Meta (R$)</Label>
                  <CurrencyInput
                    value={newSellerGoal}
                    onChange={setNewSellerGoal}
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={handleCreateSeller}
                  disabled={createSeller.isPending || !newSellerName.trim()}
                  className="w-full"
                  data-testid="button-save-seller"
                >
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sellers.length === 0 ? (
          <Card className="stat-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum vendedor cadastrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione vendedores para acompanhar suas vendas individuais.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="stat-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Vendedores Cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-right">Meta</TableHead>
                        <TableHead className="w-24 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sellers.map((seller) => (
                        <TableRow key={seller.id} className="table-row-hover">
                          <TableCell>
                            {editingId === seller.id ? (
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-40"
                                data-testid={`input-edit-name-${seller.id}`}
                              />
                            ) : (
                              <span className="font-medium">{seller.name}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingId === seller.id ? (
                              <CurrencyInput
                                value={editGoal}
                                onChange={setEditGoal}
                                className="w-32 ml-auto"
                              />
                            ) : (
                              <span className="text-primary font-medium">{formatCurrency(Number(seller.goal))}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {editingId === seller.id ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSaveEdit}
                                    data-testid={`button-save-edit-${seller.id}`}
                                  >
                                    <Check className="h-4 w-4 text-success" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    data-testid={`button-cancel-edit-${seller.id}`}
                                  >
                                    <X className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStartEdit(seller)}
                                    data-testid={`button-edit-${seller.id}`}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteSeller(seller.id)}
                                    data-testid={`button-delete-${seller.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {selectedSeller && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="stat-card">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Vendido ({selectedSeller.name})</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(totalSales)}</p>
                    </CardContent>
                  </Card>
                  <Card className="stat-card">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Meta do Período</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(totalGoal)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {sellerSales.length} dias de trabalho registrados
                  </p>
                  <Button
                    onClick={handleGenerateDays}
                    disabled={generateSales.isPending}
                    variant="outline"
                    className="gap-2"
                    data-testid="button-regenerate-seller-days"
                  >
                    <RefreshCw className={`h-4 w-4 ${generateSales.isPending ? "animate-spin" : ""}`} />
                    Regenerar Dias
                  </Button>
                </div>

                <Card className="stat-card overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Vendas de {selectedSeller.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingSales ? (
                      <div className="p-8 text-center text-muted-foreground">Carregando...</div>
                    ) : sellerSales.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-muted-foreground mb-4">Nenhum dia de trabalho gerado.</p>
                        <Button onClick={handleGenerateDays} data-testid="button-generate-seller-days">
                          Gerar Dias de Trabalho
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-24">Data</TableHead>
                              <TableHead className="w-20">Dia</TableHead>
                              <TableHead className="text-right">Meta</TableHead>
                              <TableHead className="text-right w-40">Vendas</TableHead>
                              <TableHead className="text-center w-24">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sellerSales.map((sale) => {
                              const salesValue = editingValues[sale.id] ?? Number(sale.salesValue);
                              const goal = Number(sale.goal);
                              const reached = salesValue >= goal;

                              return (
                                <TableRow key={sale.id} className="table-row-hover">
                                  <TableCell className="font-medium">{formatDate(sale.date)}</TableCell>
                                  <TableCell>
                                    <span className="text-muted-foreground">{sale.dayOfWeek}</span>
                                  </TableCell>
                                  <TableCell className="text-right text-success font-medium">
                                    {formatCurrency(goal)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <CurrencyInput
                                      value={editingValues[sale.id] ?? 0}
                                      onChange={(value) => handleSalesValueChange(sale.id, value)}
                                      className="input-sales w-32 ml-auto"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {salesValue === 0 ? (
                                      <Badge variant="secondary" className="text-xs">
                                        Pendente
                                      </Badge>
                                    ) : reached ? (
                                      <Badge className="bg-success text-success-foreground text-xs">
                                        Atingiu
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">
                                        Abaixo
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
