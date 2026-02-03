import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";

import {
  calculateDynamicDailyMaxGoal,
  calculateIdealTicket,
  DayConfig,
  DailySaleInput,
} from "@/lib/goalCalculations";

import { useGoalsConfig } from "@/hooks/useGoalsConfig";

/* =====================================================
 * TIPOS
 * ===================================================== */

export interface DailySale {
  id: string;
  date: string;
  dayOfWeek: string;
  minGoal: string;
  maxGoal: string;
  salesValue: string;
  customers: number;

  // CAMPOS CALCULADOS NO FRONTEND
  calculatedMaxGoal?: number;
  calculatedMinGoal?: number;
  idealTicket?: number | null;
}

/* =====================================================
 * QUERY PRINCIPAL
 * ===================================================== */

export function useDailySales(workDays: DayConfig[] = []) {
  const { data: goalsConfig } = useGoalsConfig();

  return useQuery<DailySale[]>({
    queryKey: ["/api/daily-sales"],
    enabled: !!goalsConfig,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/daily-sales");
      const sales: DailySale[] = await res.json();

      if (!goalsConfig || workDays.length === 0) {
        return sales;
      }

      const monthlyMaxGoal = Number(goalsConfig.maxGoal);
      const monthlyMinGoal = Number(goalsConfig.minGoal);

      const salesHistory = sales.map((s) => ({
        date: s.date,
        totalSold: Number(s.salesValue) || 0,
        customers: s.customers || 0,
      }));

      return sales.map((sale) => {
        const { dailyMaxGoal } = calculateDynamicDailyMaxGoal(
          workDays,
          monthlyMaxGoal,
          salesHistory,
          sale.date
        );

        const calculatedMinGoal =
          Math.round(
            dailyMaxGoal *
              (monthlyMinGoal / monthlyMaxGoal) *
              100
          ) / 100;

        const idealTicket = calculateIdealTicket(
          dailyMaxGoal,
          salesHistory,
          sale.date,
          sale.customers
        );

        return {
          ...sale,
          calculatedMaxGoal: dailyMaxGoal,
          calculatedMinGoal,
          idealTicket,
        };
      });
    },
  });
}


/* =====================================================
 * MUTATIONS (⚠️ ESTAVAM FALTANDO)
 * ===================================================== */

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
    mutationFn: async (
      sales: {
        date: string;
        dayOfWeek: string;
        minGoal: string;
        maxGoal: string;
        salesValue: string;
      }[]
    ) => {
      const res = await apiRequest(
        "POST",
        "/api/daily-sales/generate",
        { sales }
      );
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
