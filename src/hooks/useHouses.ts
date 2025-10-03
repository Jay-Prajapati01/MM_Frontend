import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHouses, createHouse, updateHouse, deleteHouse } from '@/lib/api';
import type { HousesListResponse, House } from '@/types/models';

export const useHouses = () => useQuery<HousesListResponse>({
  queryKey: ['houses'],
  queryFn: fetchHouses,
  staleTime: 15_000,
});

export const useCreateHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['houses'] });
    },
  });
};

export const useUpdateHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<House> }) => updateHouse(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['houses'] });
    },
  });
};

export const useDeleteHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['houses'] });
    },
  });
};
