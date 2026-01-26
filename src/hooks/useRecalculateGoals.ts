import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DailySale } from "./useDailySales";
import { toast } from "sonner";

interface RecalculateParams {
  saleId: string;
  newSalesValue: number;
  allSales: DailySale[];
  totalMinGoal: number;
  totalMaxGoal: number;
}

// Weight calculation based on day type
function getDayWeight(dayOfWeek: string): number {
  // Sábado = half day
  if (dayOfWeek === "Sáb") return 0.5;
  // All other days in the list have weight 1 (Sundays and non-worked holidays are not in the list)
  return 1;
}

export function useRecalculateGoals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, newSalesValue, allSales, totalMinGoal, totalMaxGoal }: RecalculateParams) => {
      // Find the index of the sale being updated
      const saleIndex = allSales.findIndex(s => s.id === saleId);
      if (saleIndex === -1) throw new Error("Venda não encontrada");

      // Update the current sale's value
      const { error: updateError } = await supabase
        .from("daily_sales")
        .update({ sales_value: newSalesValue })
        .eq("id", saleId);

      if (updateError) throw updateError;

      // Calculate total sales up to and including this day
      let totalSalesSoFar = 0;
      for (let i = 0; i <= saleIndex; i++) {
        if (allSales[i].id === saleId) {
          totalSalesSoFar += newSalesValue;
        } else {
          totalSalesSoFar += Number(allSales[i].sales_value);
        }
      }

      // Calculate remaining goals
      const remainingMinGoal = Math.max(0, totalMinGoal - totalSalesSoFar);
      const remainingMaxGoal = Math.max(0, totalMaxGoal - totalSalesSoFar);

      // Get future days (after the current sale)
      const futureDays = allSales.slice(saleIndex + 1);
      
      if (futureDays.length === 0) return { success: true };

      // Calculate total weight of future days
      const totalFutureWeight = futureDays.reduce((sum, day) => sum + getDayWeight(day.day_of_week), 0);

      if (totalFutureWeight === 0) return { success: true };

      // Distribute remaining goals among future days
      const minPerWeight = remainingMinGoal / totalFutureWeight;
      const maxPerWeight = remainingMaxGoal / totalFutureWeight;

      // Update future days with recalculated goals
      const updates = futureDays.map(day => {
        const weight = getDayWeight(day.day_of_week);
        return {
          id: day.id,
          min_goal: Math.round(minPerWeight * weight * 100) / 100,
          max_goal: Math.round(maxPerWeight * weight * 100) / 100,
        };
      });

      // Batch update all future days
      for (const update of updates) {
        const { error } = await supabase
          .from("daily_sales")
          .update({ min_goal: update.min_goal, max_goal: update.max_goal })
          .eq("id", update.id);
        
        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
    },
    onError: (error) => {
      toast.error("Erro ao recalcular metas: " + error.message);
    },
  });
}
