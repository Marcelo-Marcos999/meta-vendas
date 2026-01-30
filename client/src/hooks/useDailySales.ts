import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";

export interface DailySale {
  id: string;
  date: string;
  dayOfWeek: string;
  minGoal: string;
  maxGoal: string;
  salesValue: string;
  customers: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export function useDailySales() {
  return useQuery<DailySale[]>({
    queryKey: ["/api/daily-sales"],
  });
}

export function useUpsertDailySale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: { date: string; dayOfWeek: string; minGoal: string; maxGoal: string; salesValue: string }) => {
      const res = await apiRequest("POST", "/api/daily-sales", sale);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar venda: " + error.message);
    },
  });
}

export function useUpdateSalesValue() {
  const queryClient = useQueryClient();

  return useMutation({
      mutationFn: async ({
        id,
        salesValue,
        customers,
      }: {
        id: string;
        salesValue: string;
        customers: number;
      }) => {
        return apiRequest("PATCH", `/api/daily-sales/${id}`, {
          salesValue,
          customers,
        });


      // return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar venda: " + error.message);
    },
  });
}


export function useGenerateDailySales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sales: { date: string; dayOfWeek: string; minGoal: string; maxGoal: string; salesValue: string }[]) => {
      const res = await apiRequest("POST", "/api/daily-sales/generate", { sales });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
      toast.success("Dias de trabalho gerados com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao gerar dias: " + error.message);
    },
  });
}

export function useClearDailySales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/daily-sales/clear");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
      toast.success("Valores de vendas limpos com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao limpar valores: " + error.message);
    },
  });
}
