import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useDailySales,
  useGenerateDailySales,
  useClearDailySales,
  useUpdateSalesValue,
} from "@/hooks/useDailySales";
import { useGoalsConfig } from "@/hooks/useGoalsConfig";
import { useHolidays } from "@/hooks/useHolidays";
import { formatCurrency, formatDate, generateWorkDays } from "@/lib/goalCalculations";
import { RefreshCw, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CurrencyInput } from "@/components/sales/CurrencyInput";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";

export default function DailySales() {
  const [, setLocation] = useLocation();
  const { data: config } = useGoalsConfig();
  const { data: holidays = [] } = useHolidays();

  const workDays = useMemo(() => {
    if (!config?.startDate || !config?.endDate) return [];
    return generateWorkDays(config.startDate, config.endDate, holidays);
  }, [config, holidays]);

  const { data: sales = [], isLoading } = useDailySales(workDays);

  const generateSales = useGenerateDailySales();
  const clearSales = useClearDailySales();
  const updateSalesValue = useUpdateSalesValue();

  const [editingValues, setEditingValues] = useState<Record<string, number>>({});
  const [editingCustomers, setEditingCustomers] = useState<Record<string, number>>({});

  useEffect(() => {
    const values: Record<string, number> = {};
    const customers: Record<string, number> = {};

    sales.forEach((s) => {
      values[s.id] = Number(s.salesValue);
      customers[s.id] = s.customers ?? 0;
    });

    setEditingValues(values);
    setEditingCustomers(customers);
  }, [sales]);

  const handleSave = (id: string, salesValue: number, customers: number) => {
    setEditingValues((prev) => ({ ...prev, [id]: salesValue }));
    setEditingCustomers((prev) => ({ ...prev, [id]: customers }));

    updateSalesValue.mutate({
      id,
      salesValue: salesValue.toString(),
      customers,
    });
  };

  const handleGenerateDays = () => {
    if (sales.length > 0) {
      if (confirm("Isso irá limpar todos os registros. Deseja continuar?")) {
        clearSales.mutate();
      }
      return;
    }

    if (!config) {
      toast.error("Configure as metas primeiro!");
      return;
    }

    const salesData = workDays
      .filter((d) => d.weight > 0)
      .map((day) => ({
        date: day.date,
        dayOfWeek: day.dayOfWeekShort,
        minGoal: "0",
        maxGoal: "0",
        salesValue: "0",
        customers: 0,
      }));

    generateSales.mutate(salesData);
  };

  const totalSales = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.salesValue), 0),
    [sales]
  );

  if (!config) {
    return (
      <MainLayout title="Vendas Diárias">
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-10 w-10 mb-4 text-warning" />
            <p className="mb-4">Configure as metas primeiro.</p>
            <Button onClick={() => setLocation("/configuracoes")}>
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const handleExportExcel = () => {
    if (!sales.length) return;

    const data = sales.map((sale) => {
      const customers = editingCustomers[sale.id] ?? 0;
      const salesValue = editingValues[sale.id] ?? Number(sale.salesValue);
      const minGoal = Number(sale.minGoal);
      const maxGoal = Number(sale.maxGoal);

      return {
        Data: formatDate(sale.date),
        Dia: sale.dayOfWeek,
        Clientes: customers,
        "Meta Mínima": minGoal,
        "Meta Máxima": maxGoal,
        Vendas: salesValue,
        "Ticket Ideal": customers > 0 ? maxGoal / customers : "",
        "Ticket Real": customers > 0 ? salesValue / customers : "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas Diárias");
    XLSX.writeFile(workbook, "vendas-diarias.xlsx");
  };

  return (
    <MainLayout title="Vendas Diárias">
      <div className="space-y-6">
        {/* CARDS */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p>Total Vendido</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p>Meta Máxima</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(Number(config.maxGoal))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p>Meta Mínima</p>
              <p className="text-2xl font-bold text-warning">
                {formatCurrency(Number(config.minGoal))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AÇÕES */}
        <div className="flex justify-between">
          <p>{sales.length} dias registrados</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>
              📊 Exportar Excel
            </Button>
            <Button onClick={handleGenerateDays} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerar Dias
            </Button>
          </div>
        </div>

        {/* TABELA */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Vendas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">Carregando...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead className="text-right">Meta Máx.</TableHead>
                    <TableHead className="text-right">Meta Mín.</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Ticket Ideal</TableHead>
                    <TableHead className="text-right">Ticket Real</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sales.map((sale) => {
                    const salesValue = editingValues[sale.id] ?? Number(sale.salesValue);
                    const customers = editingCustomers[sale.id] ?? 0;
                    const minGoal = Number(sale.minGoal);
                    const maxGoal = Number(sale.maxGoal);

                    const ticketIdeal =
                      customers > 0 ? maxGoal / customers : null;
                    const ticketReal =
                      customers > 0 ? salesValue / customers : null;

                    return (
                      <TableRow key={sale.id}>
                        <TableCell>{formatDate(sale.date)}</TableCell>
                        <TableCell>{sale.dayOfWeek}</TableCell>
                        <TableCell className="text-right text-success">
                          {formatCurrency(maxGoal)}
                        </TableCell>
                        <TableCell className="text-right text-warning">
                          {formatCurrency(minGoal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={customers}
                            onChange={(e) =>
                              setEditingCustomers((prev) => ({
                                ...prev,
                                [sale.id]: Number(e.target.value),
                              }))
                            }
                            onBlur={(e) =>
                              handleSave(
                                sale.id,
                                salesValue,
                                Number(e.currentTarget.value)
                              )
                            }
                            className="w-24 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <CurrencyInput
                            value={salesValue}
                            onChange={(value) =>
                              handleSave(sale.id, value, customers)
                            }
                            className="w-32 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {ticketIdeal ? formatCurrency(ticketIdeal) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {ticketReal ? formatCurrency(ticketReal) : "-"}
                        </TableCell>
                        <TableCell>
                          {salesValue === 0 ? (
                            <Badge variant="secondary">Pendente</Badge>
                          ) : salesValue >= maxGoal ? (
                            <Badge className="bg-success">Superou</Badge>
                          ) : salesValue >= minGoal ? (
                            <Badge className="bg-primary">Atingiu</Badge>
                          ) : (
                            <Badge variant="destructive">Abaixo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}