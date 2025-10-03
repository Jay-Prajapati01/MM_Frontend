import { useQuery } from '@tanstack/react-query';
import { lsFetchActivity } from '@/lib/storage';

export interface UseActivityOptions {
  limit?: number; // initial slice
  enabled?: boolean;
}

export function useActivityLog(opts: UseActivityOptions = {}) {
  const { limit = 20, enabled = true } = opts;
  const query = useQuery({
    queryKey: ['activity-log'],
    queryFn: () => lsFetchActivity(),
    enabled,
    staleTime: 5_000,
  });
  const full = query.data?.list || [];
  return {
    ...query,
    list: full.slice(0, limit),
    fullList: full,
  };
}
