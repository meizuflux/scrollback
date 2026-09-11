import { For, Show, createMemo, createSignal, type Component } from "solid-js";
import ConversationsTab from "@/components/analysis/ConversationsTab";
import HighlightsTab from "@/components/analysis/HighlightsTab";
import PeopleTab from "@/components/analysis/PeopleTab";
import ProfileTab from "@/components/analysis/ProfileTab";
import type {
	AnalysisTabsProps,
	ConversationRow,
	ConversationTypeFilter,
	PeopleFilter,
	TabId,
} from "@/components/analysis/analysisTypes";

export type {
	AnalysisTabsProps,
	ConversationRow,
	ConversationTypeFilter,
	PeopleFilter,
	TabId,
} from "@/components/analysis/analysisTypes";

const tabItems: Array<{ id: TabId; label: string }> = [
	{ id: "highlights", label: "Highlights" },
	{ id: "people", label: "People" },
	{ id: "conversations", label: "Conversations" },
	{ id: "profile", label: "Profile" },
];

const AnalysisTabs: Component<AnalysisTabsProps> = (props) => {
	const [activeTab, setActiveTab] = createSignal<TabId>("highlights");
	const [peopleSearch, setPeopleSearch] = createSignal("");
	const [peopleRelationship, setPeopleRelationship] = createSignal<PeopleFilter>("all");
	const [conversationSearch, setConversationSearch] = createSignal("");
	const [conversationType, setConversationType] = createSignal<ConversationTypeFilter>("all");
	const [minimumMessages, setMinimumMessages] = createSignal("");

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
					case "blocked":
						return person.blocked?.value === true;
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
		setPeopleSearch("");
		setPeopleRelationship("all");
	};

	const clearConversationFilters = () => {
		setConversationSearch("");
		setConversationType("all");
		setMinimumMessages("");
	};

	const openPeopleFilter = (filter: PeopleFilter) => {
		setPeopleRelationship(filter);
		setActiveTab("people");
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
						peopleFiltersActive={peopleFiltersActive}
						onPeopleSearch={setPeopleSearch}
						onPeopleRelationship={setPeopleRelationship}
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
