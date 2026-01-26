import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GoalsConfig {
  id: string;
  start_date: string;
  end_date: string;
  min_goal: number;
  max_goal: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useGoalsConfig() {
  return useQuery({
    queryKey: ["goals-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals_config")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as GoalsConfig | null;
    },
  });
}

export function useSaveGoalsConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<GoalsConfig, "id" | "created_at" | "updated_at" | "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Delete existing config for this user first
      await supabase.from("goals_config").delete().eq("user_id", user.id);
      
      const { data, error } = await supabase
        .from("goals_config")
        .insert({ ...config, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals-config"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });
}
