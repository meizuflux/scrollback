export type PeopleFilter =
	| "all"
	| "followers"
	| "following"
	| "mutuals"
	| "close-friends"
	| "blocked"
	| "requested"
	| "hidden-story"
	| "pending-request"
	| "recently-unfollowed";
export type PeopleSort = "username-asc" | "username-desc" | "followers" | "following" | "close-friends" | "blocked";
export type ConversationTypeFilter = "all" | "direct" | "group";

export const PEOPLE_FILTER_OPTIONS: ReadonlyArray<{ value: PeopleFilter; label: string }> = [
	{ value: "all", label: "All people" },
	{ value: "followers", label: "Followers" },
	{ value: "following", label: "Following" },
	{ value: "mutuals", label: "Mutuals" },
	{ value: "close-friends", label: "Close friends" },
	{ value: "blocked", label: "Blocked" },
	{ value: "requested", label: "Requested to follow you" },
	{ value: "hidden-story", label: "Hidden story from" },
	{ value: "pending-request", label: "Pending follow request" },
	{ value: "recently-unfollowed", label: "Recently unfollowed" },
];

export const PEOPLE_SORT_OPTIONS: ReadonlyArray<{ value: PeopleSort; label: string }> = [
	{ value: "username-asc", label: "Username (A–Z)" },
	{ value: "username-desc", label: "Username (Z–A)" },
	{ value: "followers", label: "Followers first" },
	{ value: "following", label: "Following first" },
	{ value: "close-friends", label: "Close friends first" },
	{ value: "blocked", label: "Blocked first" },
];

export const CONVERSATION_TYPE_OPTIONS: ReadonlyArray<{ value: ConversationTypeFilter; label: string }> = [
	{ value: "all", label: "All types" },
	{ value: "direct", label: "Direct" },
	{ value: "group", label: "Group" },
];

export const PEOPLE_FILTERS: readonly PeopleFilter[] = PEOPLE_FILTER_OPTIONS.map((option) => option.value);
export const PEOPLE_SORTS: readonly PeopleSort[] = PEOPLE_SORT_OPTIONS.map((option) => option.value);

export const isPeopleFilter = (value: string): value is PeopleFilter => PEOPLE_FILTERS.includes(value as PeopleFilter);
export const isPeopleSort = (value: string): value is PeopleSort => PEOPLE_SORTS.includes(value as PeopleSort);

export const isConversationTypeFilter = (value: string): value is ConversationTypeFilter =>
	value === "all" || value === "direct" || value === "group";

export interface ConversationRow {
	title: string;
	participants: string[];
	is_group: boolean;
	messageCount: number;
	lastActivity?: Date;
}

export interface ConversationSenderStat {
	sender: string;
	count: number;
}
