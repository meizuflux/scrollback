import { useSearchParams } from "@solidjs/router";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import type {
	AnalysisTabsProps,
	ConversationTypeFilter,
	PeopleFilter,
	PeopleSort,
	TabId,
} from "@/components/analysis/analysisTypes";
import ConversationsTab from "@/components/analysis/ConversationsTab";
import HighlightsTab from "@/components/analysis/HighlightsTab";
import PeopleTab from "@/components/analysis/PeopleTab";
import ProfileTab from "@/components/analysis/ProfileTab";
import { db } from "@/db/database";
import type { ConversationSenderStat } from "@/components/analysis/analysisTypes";

export type {
	AnalysisTabsProps,
	ConversationRow,
	ConversationTypeFilter,
	PeopleFilter,
	PeopleSort,
	TabId,
} from "@/components/analysis/analysisTypes";

const tabItems: Array<{ id: TabId; label: string }> = [
	{ id: "highlights", label: "Highlights" },
	{ id: "people", label: "People" },
	{ id: "conversations", label: "Conversations" },
	{ id: "profile", label: "Profile" },
];

interface AnalysisSearchParams {
	[key: string]: string | string[] | undefined;
	tab?: string;
	peopleSearch?: string;
	relationship?: string;
	sort?: string;
	table?: string;
}

const getParam = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

const isTabId = (value: string): value is TabId => tabItems.some((tab) => tab.id === value);
const isPeopleFilter = (value: string): value is PeopleFilter =>
	[
		"all",
		"followers",
		"following",
		"mutuals",
		"close-friends",
		"blocked",
		"requested",
		"hidden-story",
		"pending-request",
		"recently-unfollowed",
	].includes(value);
const isPeopleSort = (value: string): value is PeopleSort =>
	["username-asc", "username-desc", "followers", "following", "close-friends", "blocked"].includes(value);

const AnalysisTabs: Component<AnalysisTabsProps> = (props) => {
	const [searchParams, setSearchParams] = useSearchParams<AnalysisSearchParams>();
	const [conversationSearch, setConversationSearch] = createSignal("");
	const [conversationType, setConversationType] = createSignal<ConversationTypeFilter>("all");
	const [minimumMessages, setMinimumMessages] = createSignal("");
	const [selectedConversation, setSelectedConversation] = createSignal<string | null>(null);
	const [conversationStats, setConversationStats] = createSignal<ConversationSenderStat[]>([]);
	const [conversationStatsLoading, setConversationStatsLoading] = createSignal(false);

	const loadConversationStats = async (conversation: { title: string }) => {
		if (selectedConversation() === conversation.title) {
			setSelectedConversation(null);
			return;
		}
		setSelectedConversation(conversation.title);
		const cache = JSON.parse(localStorage.getItem("conversation_stats_cache") || "{}") as Record<string, ConversationSenderStat[]>;
		if (cache[conversation.title]) { setConversationStats(cache[conversation.title]); return; }
		setConversationStatsLoading(true);
		try {
			const counts = new Map<string, number>();
			for (const message of await db.messages.filter((message) => message.conversation === conversation.title).toArray()) {
				const sender = message.sender_name || "Unknown sender";
				counts.set(sender, (counts.get(sender) || 0) + 1);
			}
			const stats = Array.from(counts, ([sender, count]) => ({ sender, count })).sort((a, b) => b.count - a.count || a.sender.localeCompare(b.sender));
			setConversationStats(stats);
			localStorage.setItem("conversation_stats_cache", JSON.stringify({ ...cache, [conversation.title]: stats }));
		} finally { setConversationStatsLoading(false); }
	};

	const activeTab = createMemo<TabId>(() => {
		const tab = getParam(searchParams.tab);
		return isTabId(tab) ? tab : "highlights";
	});
	const peopleSearch = () => getParam(searchParams.peopleSearch);
	const peopleRelationship = () => {
		const relationship = getParam(searchParams.relationship);
		return isPeopleFilter(relationship) ? relationship : "all";
	};
	const peopleSort = () => {
		const sort = getParam(searchParams.sort);
		return isPeopleSort(sort) ? sort : "username-asc";
	};
	const peopleTableOpen = () => getParam(searchParams.table) === "open";

	const setActiveTab = (tab: TabId) => setSearchParams({ tab: tab === "highlights" ? null : tab }, { replace: true });
	const setPeopleSearch = (value: string) =>
		setSearchParams({ peopleSearch: value || null, tab: "people", table: "open" }, { replace: true });
	const setPeopleRelationship = (value: PeopleFilter) =>
		setSearchParams(
			{ relationship: value === "all" ? null : value, tab: "people", table: "open" },
			{ replace: true },
		);
	const setPeopleSort = (value: PeopleSort) =>
		setSearchParams(
			{ sort: value === "username-asc" ? null : value, tab: "people", table: "open" },
			{ replace: true },
		);
	const togglePeopleTable = () =>
		setSearchParams({ table: peopleTableOpen() ? null : "open", tab: "people" }, { replace: true });

	const filteredPeople = createMemo(() => {
		const query = peopleSearch().trim().toLocaleLowerCase();
		const relationship = peopleRelationship();

		return props.people
			.filter((person) => {
				const username = person.username.toLocaleLowerCase();
				if (query && !username.includes(query)) return false;
				switch (relationship) {
					case "followers":
						return person.follower?.value === true;
					case "following":
						return person.following?.value === true;
					case "mutuals":
						return person.follower?.value === true && person.following?.value === true;
					case "close-friends":
						return person.close_friends?.value === true;
					case "blocked":
						return person.blocked?.value === true;
					case "requested":
						return person.requested_to_follow_you?.value === true;
					case "hidden-story":
						return person.hidden_story_from?.value === true;
					case "pending-request":
						return person.pending_follow_request?.value === true;
					case "recently-unfollowed":
						return person.recently_unfollowed?.value === true;
					default:
						return true;
				}
			})
			.sort((a, b) => a.username.localeCompare(b.username, undefined, { sensitivity: "base" }));
	});

	const filteredConversations = createMemo(() => {
		const query = conversationSearch().trim().toLocaleLowerCase();
		const minimum = Math.max(0, Number.parseInt(minimumMessages(), 10) || 0);
		const type = conversationType();

		return props.conversations
			.filter((conversation) => {
				if (query) {
					const searchable = [conversation.title, ...conversation.participants].join(" ").toLocaleLowerCase();
					if (!searchable.includes(query)) return false;
				}
				if (type === "group" && !conversation.is_group) return false;
				if (type === "direct" && conversation.is_group) return false;
				return conversation.messageCount >= minimum;
			})
			.sort((a, b) => {
				const countDifference = b.messageCount - a.messageCount;
				return countDifference || a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
			});
	});

	const peopleFiltersActive = () => peopleSearch().trim().length > 0 || peopleRelationship() !== "all";
	const conversationFiltersActive = () =>
		conversationSearch().trim().length > 0 || conversationType() !== "all" || minimumMessages().trim().length > 0;

	const clearPeopleFilters = () => {
		setSearchParams({ peopleSearch: null, relationship: null, tab: "people", table: "open" }, { replace: true });
	};

	const clearConversationFilters = () => {
		setConversationSearch("");
		setConversationType("all");
		setMinimumMessages("");
	};

	const openPeopleFilter = (filter: PeopleFilter) => {
		setSearchParams({
			tab: "people",
			peopleSearch: null,
			relationship: filter,
			sort: null,
			table: "open",
		});
	};

	return (
		<div class="space-y-7">
			<div class="rounded-lg border border-[#303030] bg-[#181818] p-1">
				<nav class="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Analysis sections">
					<For each={tabItems}>
						{(tab) => (
							<button
								type="button"
								class={`flex items-center justify-center rounded-lg border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
									activeTab() === tab.id
										? "border-[#7873F5] bg-[#303030] text-[#F2F2F2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
										: "border-transparent text-[#A3A3A3] hover:bg-[#202020] hover:text-[#F2F2F2]"
								}`}
								aria-current={activeTab() === tab.id ? "page" : undefined}
								onClick={() => setActiveTab(tab.id)}
							>
								{tab.label}
							</button>
						)}
					</For>
				</nav>
			</div>

			<Show
				when={!props.loading}
				fallback={
					<div class="rounded-lg border border-[#303030] bg-[#181818] p-12 text-center text-[#A3A3A3]">
						Loading your data package…
					</div>
				}
			>
				<Show when={activeTab() === "highlights"}>
					<HighlightsTab analysis={props.analysis} />
				</Show>

				<Show when={activeTab() === "people"}>
					<PeopleTab
						people={props.people}
						filteredPeople={filteredPeople()}
						peopleSearch={peopleSearch}
						peopleRelationship={peopleRelationship}
						peopleSort={peopleSort}
						peopleTableOpen={peopleTableOpen}
						peopleFiltersActive={peopleFiltersActive}
						onPeopleSearch={setPeopleSearch}
						onPeopleRelationship={setPeopleRelationship}
						onPeopleSort={setPeopleSort}
						onPeopleTableToggle={togglePeopleTable}
						onClearFilters={clearPeopleFilters}
					/>
				</Show>

				<Show when={activeTab() === "conversations"}>
					<ConversationsTab
						conversations={props.conversations}
						filteredConversations={filteredConversations()}
						conversationSearch={conversationSearch}
						conversationType={conversationType}
						minimumMessages={minimumMessages}
						conversationFiltersActive={conversationFiltersActive}
						onConversationSearch={setConversationSearch}
						onConversationType={setConversationType}
						onMinimumMessages={setMinimumMessages}
						onClearFilters={clearConversationFilters}
						selectedConversation={selectedConversation}
						conversationStats={conversationStats}
						conversationStatsLoading={conversationStatsLoading}
						onConversationClick={loadConversationStats}
					/>
				</Show>

				<Show when={activeTab() === "profile"}>
					<ProfileTab user={props.user} analysis={props.analysis} onOpenPeopleFilter={openPeopleFilter} />
				</Show>
			</Show>
		</div>
	);
};

export default AnalysisTabs;
