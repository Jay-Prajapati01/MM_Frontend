import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPayments, createPayment, updatePayment, deletePayment, generateMonthlyPayments } from '@/lib/api';

export const PAYMENTS_KEY = ['payments'];

export const usePayments = () => {
  return useQuery({ queryKey: PAYMENTS_KEY, queryFn: fetchPayments, staleTime: 15_000 });
};

export const useCreatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    }
  });
};

export const useUpdatePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) => updatePayment(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    }
  });
};

export const useDeletePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePayment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS_KEY })
  });
};

export const useGenerateMonthlyPayments = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (defaultAmount: number) => generateMonthlyPayments(defaultAmount),
    onSuccess: () => qc.invalidateQueries({ queryKey: PAYMENTS_KEY })
  });
};
