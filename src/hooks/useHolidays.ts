import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Holiday {
  id: string;
  date: string;
  name: string;
  is_worked: boolean;
  created_at: string;
  user_id: string;
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      return data as Holiday[];
    },
  });
}

export function useAddHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holiday: { date: string; name: string; is_worked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("holidays")
        .insert({ ...holiday, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
      toast.success("Feriado adicionado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar feriado: " + error.message);
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Holiday> & { id: string }) => {
      const { data, error } = await supabase
        .from("holidays")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
      toast.success("Feriado atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar feriado: " + error.message);
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("holidays")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales"] });
      toast.success("Feriado removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover feriado: " + error.message);
    },
  });
}
