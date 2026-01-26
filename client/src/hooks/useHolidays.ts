import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isWorked: boolean;
  createdAt: string;
  userId: string;
}

export function useHolidays() {
  return useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });
}

export function useAddHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holiday: { date: string; name: string; isWorked: boolean }) => {
      const res = await apiRequest("POST", "/api/holidays", holiday);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
      toast.success("Feriado adicionado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adicionar feriado: " + error.message);
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; date?: string; isWorked?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/holidays/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
      toast.success("Feriado atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar feriado: " + error.message);
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
      toast.success("Feriado removido!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover feriado: " + error.message);
    },
  });
}
