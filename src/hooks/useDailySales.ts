import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DailySale {
  id: string;
  date: string;
  day_of_week: string;
  min_goal: number;
  max_goal: number;
  sales_value: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useDailySales() {
  return useQuery({
    queryKey: ["daily-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_sales")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      return data as DailySale[];
    },
  });
}

export function useUpsertDailySale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: Omit<DailySale, "id" | "created_at" | "updated_at" | "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("daily_sales")
        .upsert({ ...sale, user_id: user.id }, { onConflict: "date" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar venda: " + error.message);
    },
  });
}

export function useUpdateSalesValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sales_value }: { id: string; sales_value: number }) => {
      const { data, error } = await supabase
        .from("daily_sales")
        .update({ sales_value })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
    },
    onError: (error) => {
      toast.error("Erro ao atualizar venda: " + error.message);
    },
  });
}

export function useGenerateDailySales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sales: Omit<DailySale, "id" | "created_at" | "updated_at" | "user_id">[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Clear existing sales for this user
      await supabase.from("daily_sales").delete().eq("user_id", user.id);
      
      if (sales.length === 0) return [];
      
      const salesWithUserId = sales.map(s => ({ ...s, user_id: user.id }));
      
      const { data, error } = await supabase
        .from("daily_sales")
        .insert(salesWithUserId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
      toast.success("Dias de trabalho gerados com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao gerar dias: " + error.message);
    },
  });
}
