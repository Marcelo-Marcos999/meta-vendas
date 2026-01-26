import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(formData.username, formData.password);
        toast.success("Conta criada com sucesso!");
      } else {
        await login(formData.username, formData.password);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Cálculo de Metas</CardTitle>
          <CardDescription className="text-muted-foreground">
            {isRegister ? "Crie sua conta para começar" : "Faça login para acessar suas metas e vendas diárias"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                data-testid="input-username"
                placeholder="Digite seu usuário"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              data-testid="button-submit"
              className="w-full h-12"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Carregando..." : isRegister ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              data-testid="button-toggle-register"
              className="text-sm text-muted-foreground hover:text-primary"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Já tem conta? Faça login" : "Não tem conta? Registre-se"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
