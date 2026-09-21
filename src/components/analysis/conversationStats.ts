import { createResource, type Accessor, type Resource } from "solid-js";
import type { ConversationSenderStat } from "@/components/analysis/analysisTypes";
import { db } from "@/db/database";

const STATS_CACHE_KEY = "conversation_stats_cache";

const readStatsCache = (): Record<string, ConversationSenderStat[]> => {
	try {
		return JSON.parse(localStorage.getItem(STATS_CACHE_KEY) || "{}") as Record<string, ConversationSenderStat[]>;
	} catch {
		return {};
	}
};

const writeStatsCache = (cache: Record<string, ConversationSenderStat[]>): void => {
	try {
		localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(cache));
	} catch {
		// Caching is best-effort; a full quota should not fail the request.
	}
};

const computeConversationStats = async (title: string): Promise<ConversationSenderStat[]> => {
	const counts = new Map<string, number>();
	for (const message of await db.messages.filter((row) => row.conversation === title).toArray()) {
		const sender = message.sender_name || "Unknown sender";
		counts.set(sender, (counts.get(sender) || 0) + 1);
	}
	return Array.from(counts, ([sender, count]) => ({ sender, count })).sort(
		(a, b) => b.count - a.count || a.sender.localeCompare(b.sender),
	);
};

export const loadConversationStats = (title: string): ConversationSenderStat[] | Promise<ConversationSenderStat[]> => {
	const cache = readStatsCache();
	if (cache[title]) return cache[title];
	return computeConversationStats(title).then((stats) => {
		writeStatsCache({ ...cache, [title]: stats });
		return stats;
	});
};

/**
 * Resource keyed to the selected conversation title. Requests are owned by the
 * key: when the selection changes, a slower earlier request can no longer
 * overwrite the stats shown for the currently selected conversation.
 */
export const createConversationStats = (selected: Accessor<string | null>): Resource<ConversationSenderStat[]> =>
	createResource(selected, loadConversationStats)[0];
