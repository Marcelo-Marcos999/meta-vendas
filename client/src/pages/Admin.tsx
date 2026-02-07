import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "../components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/queryClient";
import { Trash2, ShieldCheck, User, AlertCircle, Settings, Save, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUser {
  id: string;
  username: string;
  password: string;
  isAdmin: boolean;
  createdAt: string;
}

interface AdminSettings {
  maxUsers: number;
  currentUserCount: number;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [maxUsersInput, setMaxUsersInput] = useState<number>(0);

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.isAdmin === true,
  });

  const { data: settings } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
    enabled: user?.isAdmin === true,
  });

  useEffect(() => {
    if (settings) {
      setMaxUsersInput(settings.maxUsers);
    }
  }, [settings]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast.success("Usuário deletado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao deletar usuário: " + error.message);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (maxUsers: number) => {
      const res = await apiRequest("POST", "/api/admin/settings", { maxUsers });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  const handleDelete = (id: string, username: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário "${username}" e todos os seus dados? Esta ação não pode ser desfeita.`)) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(maxUsersInput);
  };

  if (!user?.isAdmin) {
    return (
      <MainLayout title="Administração">
        <Card className="stat-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground text-center mb-4">
              Você não tem permissão para acessar esta página.
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Administração">
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Usuários</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Usuários (não-admin)</p>
                  <p className="text-2xl font-bold">{settings?.currentUserCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Limite de Usuários</p>
                  <p className="text-2xl font-bold">
                    {settings?.maxUsers === 0 ? "Ilimitado" : settings?.maxUsers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="stat-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-users">Limite de Usuários</Label>
                <Input
                  id="max-users"
                  type="number"
                  min="0"
                  value={maxUsersInput}
                  onChange={(e) => setMaxUsersInput(parseInt(e.target.value) || 0)}
                  className="w-32"
                  data-testid="input-max-users"
                />
                <p className="text-xs text-muted-foreground">
                  0 = ilimitado
                </p>
              </div>
              <Button
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
                className="gap-2"
                data-testid="button-save-settings"
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum usuário cadastrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Usuário</TableHead>
                      <TableHead>Senha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead className="w-24 text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{u.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded" data-testid={`text-password-${u.id}`}>
                            {u.password}
                          </code>
                        </TableCell>
                        <TableCell>
                          {u.isAdmin ? (
                            <Badge className="bg-primary text-primary-foreground">
                              Administrador
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Usuário</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(u.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-center">
                          {u.isAdmin ? (
                            <span className="text-xs text-muted-foreground">Protegido</span>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(u.id, u.username)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-user-${u.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
