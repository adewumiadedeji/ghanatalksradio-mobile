import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gtr_poll_votes_v1';

/**
 * Which option this device voted for on each poll, keyed by poll id
 * (slug for Engagement-backed polls). Needed because Engagement's poll
 * API never tells the client "did I already vote" on a plain GET/list -
 * only the vote() call's own response says which option just got
 * recorded (see PublicPollController::detailArray() - no such field).
 * Without this, refreshing the poll list lost that state entirely: the
 * UI would show the poll as not-yet-voted again (fill bar/percentage
 * hidden, options tappable), and tapping an option would silently fail
 * against PollVotingException's "You have already voted in this poll."
 * with no feedback, since the vote had in fact already gone through
 * server-side.
 */
let cache: Record<string, number> | null = null;

async function load(): Promise<Record<string, number>> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  cache = raw ? JSON.parse(raw) : {};
  return cache!;
}

export async function getVotedOption(pollId: string): Promise<number | null> {
  const votes = await load();
  return votes[pollId] ?? null;
}

export async function getVotedOptions(pollIds: string[]): Promise<Record<string, number>> {
  const votes = await load();
  return Object.fromEntries(pollIds.filter((id) => id in votes).map((id) => [id, votes[id]]));
}

export async function recordVote(pollId: string, optionId: number): Promise<void> {
  const votes = await load();
  votes[pollId] = optionId;
  cache = votes;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}
