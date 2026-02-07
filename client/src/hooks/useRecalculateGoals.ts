import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { toast } from "sonner";

interface DailySale {
  id: string;
  dayOfWeek: string;
  salesValue: string;
}

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
    mutationFn: async ({
      saleId,
      newSalesValue,
      allSales,
      totalMinGoal,
      totalMaxGoal,
    }: RecalculateParams) => {
      const saleIndex = allSales.findIndex(s => s.id === saleId);
      if (saleIndex === -1) {
        throw new Error("Venda não encontrada");
      }

      // 1️⃣ Atualiza a venda atual
      await apiRequest("PATCH", `/api/daily-sales/${saleId}`, {
        salesValue: newSalesValue,
      });

      // 2️⃣ Soma REAL das vendas até o dia atual
      let totalSalesSoFar = 0;
      for (let i = 0; i <= saleIndex; i++) {
        const value =
          i === saleIndex
            ? parseFloat(newSalesValue) || 0
            : parseFloat(allSales[i].salesValue) || 0;
        totalSalesSoFar += value;
      }

      // 3️⃣ Calcula quanto falta do mês
      const remainingMinGoal = Math.max(0, totalMinGoal - totalSalesSoFar);
      const remainingMaxGoal = Math.max(0, totalMaxGoal - totalSalesSoFar);

      // 4️⃣ Dias futuros
      const futureDays = allSales.slice(saleIndex + 1);
      if (!futureDays.length) return;

      // 5️⃣ Peso total dos dias futuros
      const totalFutureWeight = futureDays.reduce(
        (sum, day) => sum + getDayWeight(day.dayOfWeek),
        0
      );

      if (totalFutureWeight === 0) return;

      const minPerWeight = remainingMinGoal / totalFutureWeight;
      const maxPerWeight = remainingMaxGoal / totalFutureWeight;

      // 6️⃣ Atualiza metas futuras no banco
      await Promise.all(
        futureDays.map(day => {
          const weight = getDayWeight(day.dayOfWeek);
          return apiRequest(
            "PATCH",
            `/api/daily-sales/${day.id}/goals`,
            {
              minGoal: (minPerWeight * weight).toFixed(2),
              maxGoal: (maxPerWeight * weight).toFixed(2),
            }
          );
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao recalcular metas: " + error.message);
    },
  });
}
