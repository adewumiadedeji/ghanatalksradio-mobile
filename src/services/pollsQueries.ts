import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPollList, voteOnPoll, PollDto } from './pollsApi';

const POLLS_QUERY_KEY = ['polls', 'list'];

export function usePollList(token: string | null) {
  return useQuery({
    queryKey: [...POLLS_QUERY_KEY, token],
    queryFn: () => fetchPollList(token),
    staleTime: 1000 * 60,
  });
}

export function useVoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { token: string; pollId: string; optionId: number }) =>
      voteOnPoll(vars.token, vars.pollId, vars.optionId),
    onSuccess: (updatedPoll: PollDto) => {
      queryClient.setQueriesData<PollDto[] | undefined>({ queryKey: POLLS_QUERY_KEY }, (old: PollDto[] | undefined) =>
        old?.map((p: PollDto) => (p.id === updatedPoll.id ? updatedPoll : p))
      );
    },
  });
}
