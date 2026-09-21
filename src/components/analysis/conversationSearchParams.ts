import { useSearchParams } from "@solidjs/router";
import { createEffect } from "solid-js";
import { type ConversationTypeFilter, isConversationTypeFilter } from "@/components/analysis/analysisTypes";

interface ConversationSearchParams {
	[key: string]: string | string[] | undefined;
	q?: string;
	type?: string;
	minMessages?: string;
}

const getParam = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

/**
 * Current Conversations screen view, owned by the query string.
 *
 * - `q` searches titles and participants, `type` is `direct`/`group`, and
 *   `minMessages` sets a floor on message count. Defaults are omitted.
 * - Typing (search and minimum messages) replaces the current history entry
 *   so Back does not have to step through every keystroke. Explicit type
 *   changes push entries.
 * - Invalid values fall back to their defaults and are canonicalized away via
 *   replacement navigation (so a stale/copied URL self-heals).
 */
export const useConversationSearchParams = () => {
	const [searchParams, setSearchParams] = useSearchParams<ConversationSearchParams>();

	const search = () => getParam(searchParams.q);
	const type = (): ConversationTypeFilter => {
		const value = getParam(searchParams.type);
		return isConversationTypeFilter(value) ? value : "all";
	};
	const minMessages = () => getParam(searchParams.minMessages);
	const filtersActive = () => search().trim().length > 0 || type() !== "all" || minMessages().trim().length > 0;

	createEffect(() => {
		const rawType = searchParams.type;
		if (rawType !== undefined && !isConversationTypeFilter(getParam(rawType))) {
			setSearchParams({ type: null }, { replace: true });
		}
	});

	const setSearch = (value: string) => setSearchParams({ q: value || null }, { replace: true });
	const setType = (value: ConversationTypeFilter) => setSearchParams({ type: value === "all" ? null : value });
	const setMinMessages = (value: string) => setSearchParams({ minMessages: value || null }, { replace: true });
	const clearFilters = () => setSearchParams({ q: null, type: null, minMessages: null });

	return { search, type, minMessages, filtersActive, setSearch, setType, setMinMessages, clearFilters };
};
