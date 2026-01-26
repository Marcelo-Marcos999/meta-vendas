import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useHolidays, useAddHoliday, useUpdateHoliday, useDeleteHoliday } from "@/hooks/useHolidays";
import { formatFullDate } from "@/lib/goalCalculations";
import { Plus, Trash2, Calendar, Briefcase, Coffee } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Holidays() {
  const { data: holidays = [], isLoading } = useHolidays();
  const addHoliday = useAddHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [isOpen, setIsOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    date: "",
    name: "",
    is_worked: false,
  });

  const handleAdd = () => {
    if (!newHoliday.date || !newHoliday.name) return;
    addHoliday.mutate(newHoliday, {
      onSuccess: () => {
        setNewHoliday({ date: "", name: "", is_worked: false });
        setIsOpen(false);
      },
    });
  };

  const handleToggleWorked = (id: string, currentValue: boolean) => {
    updateHoliday.mutate({ id, is_worked: !currentValue });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este feriado?")) {
      deleteHoliday.mutate(id);
    }
  };

  const workedCount = holidays.filter((h) => h.is_worked).length;
  const notWorkedCount = holidays.filter((h) => !h.is_worked).length;

  return (
    <MainLayout title="Feriados">
      <div className="space-y-6 animate-fade-in">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Feriados</p>
                <p className="text-2xl font-bold">{holidays.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trabalhados (50%)</p>
                <p className="text-2xl font-bold">{workedCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Coffee className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Não Trabalhados</p>
                <p className="text-2xl font-bold">{notWorkedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Holiday Button */}
        <div className="flex justify-end">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Feriado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Feriado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Feriado</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Natal, Ano Novo..."
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="is_worked" className="font-medium">
                      Feriado Trabalhado?
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Se sim, conta como 50% da meta. Se não, é abatido do cálculo.
                    </p>
                  </div>
                  <Switch
                    id="is_worked"
                    checked={newHoliday.is_worked}
                    onCheckedChange={(checked) =>
                      setNewHoliday({ ...newHoliday, is_worked: checked })
                    }
                  />
                </div>
                <Button
                  onClick={handleAdd}
                  disabled={!newHoliday.date || !newHoliday.name || addHoliday.isPending}
                  className="w-full"
                >
                  Adicionar Feriado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Holidays Table */}
        <Card className="stat-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Lista de Feriados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : holidays.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum feriado cadastrado.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Adicione os feriados do período para um cálculo preciso das metas.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Trabalhado</TableHead>
                    <TableHead className="text-center">Impacto</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id} className="table-row-hover">
                      <TableCell className="font-medium">
                        {formatFullDate(holiday.date)}
                      </TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={holiday.is_worked}
                          onCheckedChange={() =>
                            handleToggleWorked(holiday.id, holiday.is_worked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {holiday.is_worked ? (
                          <Badge className="bg-warning text-warning-foreground">
                            50% da meta
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Abatido</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(holiday.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="stat-card border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-2">Como funciona?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong>Feriado trabalhado:</strong> Conta como 50% da meta diária
              </li>
              <li>
                • <strong>Feriado não trabalhado:</strong> É abatido do cálculo total de dias
              </li>
              <li>
                • <strong>Sábados:</strong> Contam automaticamente como 50% da meta
              </li>
              <li>
                • <strong>Domingos:</strong> Não são considerados no cálculo
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
