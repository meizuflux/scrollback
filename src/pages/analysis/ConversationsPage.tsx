import { type Component, createMemo, createSignal } from "solid-js";
import { useAnalysisData } from "@/components/analysis/analysisData";
import type { ConversationRow } from "@/components/analysis/analysisTypes";
import ConversationsTab from "@/components/analysis/ConversationsTab";
import { useConversationSearchParams } from "@/components/analysis/conversationSearchParams";
import { createConversationStats } from "@/components/analysis/conversationStats";

const ConversationsPage: Component = () => {
	const { conversations } = useAnalysisData();
	const { search, type, minMessages, filtersActive, setSearch, setType, setMinMessages, clearFilters } =
		useConversationSearchParams();
	const [selectedConversation, setSelectedConversation] = createSignal<string | null>(null);
	const conversationStats = createConversationStats(selectedConversation);

	const toggleConversation = (conversation: ConversationRow) => {
		setSelectedConversation((current) => (current === conversation.title ? null : conversation.title));
	};

	const filteredConversations = createMemo(() => {
		const query = search().trim().toLocaleLowerCase();
		const minimum = Math.max(0, Number.parseInt(minMessages(), 10) || 0);
		const currentType = type();

		return [...conversations()]
			.filter((conversation) => {
				if (query) {
					const searchable = [conversation.title, ...conversation.participants].join(" ").toLocaleLowerCase();
					if (!searchable.includes(query)) return false;
				}
				if (currentType === "group" && !conversation.is_group) return false;
				if (currentType === "direct" && conversation.is_group) return false;
				return conversation.messageCount >= minimum;
			})
			.sort((a, b) => {
				const countDifference = b.messageCount - a.messageCount;
				return countDifference || a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
			});
	});

	return (
		<ConversationsTab
			conversations={conversations()}
			filteredConversations={filteredConversations()}
			conversationSearch={search}
			conversationType={type}
			minimumMessages={minMessages}
			conversationFiltersActive={filtersActive}
			onConversationSearch={setSearch}
			onConversationType={setType}
			onMinimumMessages={setMinMessages}
			onClearFilters={clearFilters}
			selectedConversation={selectedConversation}
			conversationStats={conversationStats}
			onConversationClick={toggleConversation}
		/>
	);
};

export default ConversationsPage;
