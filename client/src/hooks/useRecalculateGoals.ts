import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DailySale } from "./useDailySales";
import { toast } from "sonner";

interface RecalculateParams {
  saleId: string;
  newSalesValue: string;
  allSales: DailySale[];
  totalMinGoal: number;
  totalMaxGoal: number;
}

function getDayWeight(dayOfWeek: string): number {
  if (dayOfWeek === "Sáb") return 0.5;
  if (dayOfWeek === "Dom") return 0;
  return 1;
}

export function useRecalculateGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, newSalesValue, allSales, totalMinGoal, totalMaxGoal }: RecalculateParams) => {
      const saleIndex = allSales.findIndex(s => s.id === saleId);
      if (saleIndex === -1) throw new Error("Venda não encontrada");

      // First, update the current sale value
      await apiRequest("PATCH", `/api/daily-sales/${saleId}`, { salesValue: newSalesValue });

      // Calculate total sales up to and including the current day
      let totalSalesSoFar = 0;
      for (let i = 0; i <= saleIndex; i++) {
        const saleValue = i === saleIndex 
          ? parseFloat(newSalesValue) || 0
          : parseFloat(allSales[i].salesValue) || 0;
        totalSalesSoFar += saleValue;
      }

      // Calculate remaining goals (what's left to sell to meet the target)
      const remainingMinGoal = Math.max(0, totalMinGoal - totalSalesSoFar);
      const remainingMaxGoal = Math.max(0, totalMaxGoal - totalSalesSoFar);

      // Get future days (after the current sale)
      const futureDays = allSales.slice(saleIndex + 1);
      
      if (futureDays.length === 0) return { success: true };

      // Calculate total weight of future days
      const totalFutureWeight = futureDays.reduce((sum, day) => {
        const weight = getDayWeight(day.dayOfWeek);
        return sum + weight;
      }, 0);

      if (totalFutureWeight === 0) return { success: true };

      // Distribute remaining goals proportionally based on weight
      const minPerWeight = remainingMinGoal / totalFutureWeight;
      const maxPerWeight = remainingMaxGoal / totalFutureWeight;

      // Update each future day's goals
      const updatePromises = futureDays.map(day => {
        const weight = getDayWeight(day.dayOfWeek);
        const minGoal = (Math.round(minPerWeight * weight * 100) / 100).toString();
        const maxGoal = (Math.round(maxPerWeight * weight * 100) / 100).toString();
        
        return apiRequest("PATCH", `/api/daily-sales/${day.id}/goals`, { minGoal, maxGoal });
      });

      await Promise.all(updatePromises);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao recalcular metas: " + error.message);
    },
  });
}
