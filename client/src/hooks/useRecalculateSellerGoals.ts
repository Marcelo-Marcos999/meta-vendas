import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SellerDailySale } from "./useSellers";
import { toast } from "sonner";

interface RecalculateParams {
  saleId: string;
  newSalesValue: string;
  allSales: SellerDailySale[];
  totalGoal: number;
  sellerId: string;
}

function getDayWeight(dayOfWeek: string): number {
  if (dayOfWeek === "Sáb") return 0.5;
  if (dayOfWeek === "Dom") return 0;
  return 1;
}

export function useRecalculateSellerGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, newSalesValue, allSales, totalGoal, sellerId }: RecalculateParams) => {
      const saleIndex = allSales.findIndex(s => s.id === saleId);
      if (saleIndex === -1) throw new Error("Venda não encontrada");

      // First, update the current sale value
      await apiRequest("PATCH", `/api/seller-sales/${saleId}`, { salesValue: newSalesValue });

      // Calculate total sales up to and including the current day
      let totalSalesSoFar = 0;
      for (let i = 0; i <= saleIndex; i++) {
        const saleValue = i === saleIndex 
          ? parseFloat(newSalesValue) || 0
          : parseFloat(allSales[i].salesValue) || 0;
        totalSalesSoFar += saleValue;
      }

      // Calculate remaining goal (what's left to sell to meet the target)
      const remainingGoal = Math.max(0, totalGoal - totalSalesSoFar);

      // Get future days (after the current sale)
      const futureDays = allSales.slice(saleIndex + 1);
      
      if (futureDays.length === 0) return { success: true, sellerId };

      // Calculate total weight of future days
      const totalFutureWeight = futureDays.reduce((sum, day) => {
        const weight = getDayWeight(day.dayOfWeek);
        return sum + weight;
      }, 0);

      if (totalFutureWeight === 0) return { success: true, sellerId };

      // Distribute remaining goal proportionally based on weight
      const goalPerWeight = remainingGoal / totalFutureWeight;

      // Update each future day's goal
      const updatePromises = futureDays.map(day => {
        const weight = getDayWeight(day.dayOfWeek);
        const goal = (Math.round(goalPerWeight * weight * 100) / 100).toString();
        
        return apiRequest("PATCH", `/api/seller-sales/${day.id}/goal`, { goal });
      });

      await Promise.all(updatePromises);

      return { success: true, sellerId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sellers/${data.sellerId}/sales`] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao recalcular metas: " + error.message);
    },
  });
}
