import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { toast } from "sonner";

export interface GoalsConfig {
  id: string;
  startDate: string;
  endDate: string;
  minGoal: string;
  maxGoal: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export function useGoalsConfig() {
  return useQuery<GoalsConfig | null>({
    queryKey: ["/api/goals-config"],
  });
}

export function useSaveGoalsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: { startDate: string; endDate: string; minGoal: string; maxGoal: string }) => {
      const res = await apiRequest("POST", "/api/goals-config", config);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-sales"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });
}
