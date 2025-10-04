import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateHouse } from '@/lib/api';

export const useUpdateHouse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateHouse(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['houses'] });
    }
  });
};
