import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  lsFetchExpenditures, 
  lsCreateExpenditure, 
  lsUpdateExpenditure, 
  lsDeleteExpenditure,
  CreateExpenditureInput 
} from '@/lib/storage';
import { Expenditure } from '@/types/models';

// Fetch expenditures
export function useExpenditures() {
  return useQuery({
    queryKey: ['expenditures'],
    queryFn: lsFetchExpenditures,
    staleTime: 30000, // 30 seconds
  });
}

// Create expenditure
export function useCreateExpenditure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateExpenditureInput) => lsCreateExpenditure(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
    },
  });
}

// Update expenditure
export function useUpdateExpenditure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Expenditure> }) => 
      lsUpdateExpenditure(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
    },
  });
}

// Delete expenditure
export function useDeleteExpenditure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => lsDeleteExpenditure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenditures'] });
    },
  });
}