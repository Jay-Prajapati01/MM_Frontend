import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api';
import { PAYMENTS_KEY } from './usePayments';

export const useVehicles = () => {
  return useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles, staleTime: 30_000 });
};

export const useCreateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['vehicles'] });
  qc.invalidateQueries({ queryKey: ['houses'] });
  qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    }
  });
};

export const useUpdateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateVehicle(id, updates),
    onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['vehicles'] });
  qc.invalidateQueries({ queryKey: ['houses'] });
  qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    }
  });
};

export const useDeleteVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['vehicles'] });
  qc.invalidateQueries({ queryKey: ['houses'] });
  qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    }
  });
};
