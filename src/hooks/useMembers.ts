import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMembers, createMember, updateMember, deleteMember } from '@/lib/api';

export const useMembers = () => {
  return useQuery({ queryKey: ['members'], queryFn: fetchMembers, staleTime: 30_000 });
};

export const useCreateMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMember,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['houses'] }); // member counts might change occupancy
    }
  });
};

export const useUpdateMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateMember(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['houses'] }); // member counts might change occupancy
    }
  });
};

export const useDeleteMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['houses'] }); // member counts might change occupancy
    }
  });
};
