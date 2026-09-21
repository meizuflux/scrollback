import { useSearchParams } from "@solidjs/router";
import { type Component, createMemo, createSignal, Match, Show, Switch } from "solid-js";
import {
	isPeopleFilter,
	isPeopleSort,
	isTabId,
	type ConversationRow,
	type ConversationTypeFilter,
	type PeopleFilter,
	type PeopleSort,
	type TabId,
} from "@/components/analysis/analysisTypes";
import ConversationsTab from "@/components/analysis/ConversationsTab";
import HighlightsTab from "@/components/analysis/Overview";
import PeopleTab from "@/components/analysis/PeopleTab";
import ProfileTab from "@/components/analysis/ProfileTab";
import { LoadingState } from "@/components/ui";
import { createConversationStats } from "@/components/analysis/conversationStats";
import type { StoredUser } from "@/db/database";
import type { AnalysisTabsProps } from "@/components/analysis/analysisTypes";

interface AnalysisSearchParams {
	[key: string]: string | string[] | undefined;
	tab?: string;
	peopleSearch?: string;
	relationship?: string;
	sort?: string;
	table?: string;
}

const getParam = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

const AnalysisTabs: Component<AnalysisTabsProps> = (props) => {
	const [searchParams, setSearchParams] = useSearchParams<AnalysisSearchParams>();
	const [conversationSearch, setConversationSearch] = createSignal("");
	const [conversationType, setConversationType] = createSignal<ConversationTypeFilter>("all");
	const [minimumMessages, setMinimumMessages] = createSignal("");
	const [selectedConversation, setSelectedConversation] = createSignal<string | null>(null);
	const conversationStats = createConversationStats(selectedConversation);

	const toggleConversation = (conversation: ConversationRow) => {
		setSelectedConversation((current) => (current === conversation.title ? null : conversation.title));
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

	const compareUsernames = (a: StoredUser, b: StoredUser) =>
		a.username.localeCompare(b.username, undefined, { sensitivity: "base" });

	const sortPeople = (people: StoredUser[]) => {
		switch (peopleSort()) {
			case "username-desc":
				return [...people].sort((a, b) => compareUsernames(a, b) * -1);
			case "followers":
				return [...people].sort(
					(a, b) =>
						Number(b.follower?.value === true) - Number(a.follower?.value === true) ||
						compareUsernames(a, b),
				);
			case "following":
				return [...people].sort(
					(a, b) =>
						Number(b.following?.value === true) - Number(a.following?.value === true) ||
						compareUsernames(a, b),
				);
			case "close-friends":
				return [...people].sort(
					(a, b) =>
						Number(b.close_friends?.value === true) - Number(a.close_friends?.value === true) ||
						compareUsernames(a, b),
				);
			case "blocked":
				return [...people].sort(
					(a, b) =>
						Number(b.blocked?.value === true) - Number(a.blocked?.value === true) || compareUsernames(a, b),
				);
			default:
				return [...people].sort(compareUsernames);
		}
	};

	const filteredPeople = createMemo(() => {
		const query = peopleSearch().trim().toLocaleLowerCase();
		const relationship = peopleRelationship();

		const matches = props.people.filter((person) => {
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
		});

		return sortPeople(matches);
	});

	const filteredConversations = createMemo(() => {
		const query = conversationSearch().trim().toLocaleLowerCase();
		const minimum = Math.max(0, Number.parseInt(minimumMessages(), 10) || 0);
		const type = conversationType();

		return [...props.conversations]
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
		<Show when={!props.loading} fallback={<LoadingState label="Loading your data package…" />}>
			<Switch>
				<Match when={activeTab() === "highlights"}>
					<HighlightsTab analysis={props.analysis} />
				</Match>
				<Match when={activeTab() === "people"}>
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
				</Match>
				<Match when={activeTab() === "conversations"}>
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
						onConversationClick={toggleConversation}
					/>
				</Match>
				<Match when={activeTab() === "profile"}>
					<ProfileTab user={props.user} analysis={props.analysis} onOpenPeopleFilter={openPeopleFilter} />
				</Match>
			</Switch>
		</Show>
	);
};

export default AnalysisTabs;
