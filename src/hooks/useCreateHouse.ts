import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHouse } from '@/lib/api';

export const useCreateHouse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createHouse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['houses'] });
    }
  });
};
