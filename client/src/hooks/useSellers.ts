import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";

export interface Seller {
  id: string;
  name: string;
  goal: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface SellerDailySale {
  id: string;
  date: string;
  dayOfWeek: string;
  goal: string;
  salesValue: string;
  createdAt: string;
  updatedAt: string;
  sellerId: string;
  userId: string;
}

export function useSellers() {
  return useQuery<Seller[]>({
    queryKey: ["/api/sellers"],
  });
}

export function useCreateSeller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seller: { name: string; goal: string }) => {
      const res = await apiRequest("POST", "/api/sellers", seller);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      toast.success("Vendedor criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar vendedor: " + error.message);
    },
  });
}

export function useUpdateSeller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; goal?: string }) => {
      const res = await apiRequest("PATCH", `/api/sellers/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      toast.success("Vendedor atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar vendedor: " + error.message);
    },
  });
}

export function useDeleteSeller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/sellers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sellers"] });
      toast.success("Vendedor removido com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover vendedor: " + error.message);
    },
  });
}

export function useSellerDailySales(sellerId: string | null) {
  return useQuery<SellerDailySale[]>({
    queryKey: [`/api/sellers/${sellerId}/sales`],
    enabled: !!sellerId,
  });
}

export function useGenerateSellerSales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sellerId, sales }: { sellerId: string; sales: { date: string; dayOfWeek: string; goal: string; salesValue: string }[] }) => {
      const res = await apiRequest("POST", `/api/sellers/${sellerId}/sales/generate`, { sales });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sellers/${variables.sellerId}/sales`] });
      toast.success("Dias de trabalho gerados com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao gerar dias: " + error.message);
    },
  });
}

export function useUpdateSellerSalesValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, salesValue, sellerId }: { id: string; salesValue: string; sellerId: string }) => {
      const res = await apiRequest("PATCH", `/api/seller-sales/${id}`, { salesValue });
      return { ...await res.json(), sellerId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sellers/${data.sellerId}/sales`] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar venda: " + error.message);
    },
  });
}

export function useClearSellerSales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sellerId: string) => {
      const res = await apiRequest("POST", `/api/sellers/${sellerId}/sales/clear`);
      return res.json();
    },
    onSuccess: (_, sellerId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sellers/${sellerId}/sales`] });
      toast.success("Valores de vendas limpos com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao limpar valores: " + error.message);
    },
  });
}
