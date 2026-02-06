import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/* =========================
   TIPOS
========================= */

export interface DailySale {
  id: string;
  date: string;
  dayOfWeek: string;
  minGoal: string;
  maxGoal: string;
  salesValue: string;
  customers?: number;
}

/* =========================
   QUERIES
========================= */

export function useDailySales(workDays?: any[]) {
  return useQuery<DailySale[]>({
    queryKey: ["/api/daily-sales"],
  });
}

/* =========================
   MUTATIONS
========================= */

export function useGenerateDailySales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sales: any[]) => {
      const res = await apiRequest("POST", "/api/daily-sales/generate", {
        sales,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
    },
  });
}

export function useClearDailySales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/daily-sales/clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
    },
  });
}

/* =========================
   ✅ ESTE ERA O QUE FALTAVA
========================= */

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
      const res = await apiRequest("PATCH", `/api/daily-sales/${id}`, {
        salesValue,
        customers,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
    },
  });
}