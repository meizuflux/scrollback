import { For, Show, type Component, type Resource } from "solid-js";
import { Button, EmptyState, Field, PageHeading, Panel, Select, TextInput } from "@/components/ui";
import {
	CONVERSATION_TYPE_OPTIONS,
	type ConversationRow,
	type ConversationSenderStat,
	type ConversationTypeFilter,
} from "@/components/analysis/analysisTypes";

interface ConversationsTabProps {
	conversations: ConversationRow[];
	filteredConversations: ConversationRow[];
	conversationSearch: () => string;
	conversationType: () => ConversationTypeFilter;
	minimumMessages: () => string;
	conversationFiltersActive: () => boolean;
	onConversationSearch: (value: string) => void;
	onConversationType: (value: ConversationTypeFilter) => void;
	onMinimumMessages: (value: string) => void;
	onClearFilters: () => void;
	selectedConversation: () => string | null;
	conversationStats: Resource<ConversationSenderStat[]>;
	onConversationClick: (conversation: ConversationRow) => void;
}

interface ConversationFiltersProps {
	conversationSearch: () => string;
	conversationType: () => ConversationTypeFilter;
	minimumMessages: () => string;
	conversationFiltersActive: () => boolean;
	onConversationSearch: (value: string) => void;
	onConversationType: (value: ConversationTypeFilter) => void;
	onMinimumMessages: (value: string) => void;
	onClearFilters: () => void;
}

const ConversationFilters: Component<ConversationFiltersProps> = (props) => (
	<div class="border-b border-edge pb-5">
		<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_170px_auto] md:items-end">
			<Field label="Search conversations">
				<TextInput
					type="search"
					value={props.conversationSearch()}
					placeholder="Search title or participant"
					onInput={(event) => props.onConversationSearch(event.currentTarget.value)}
				/>
			</Field>
			<Field label="Type">
				<Select
					value={props.conversationType()}
					onChange={(event) => props.onConversationType(event.currentTarget.value as ConversationTypeFilter)}
				>
					<For each={CONVERSATION_TYPE_OPTIONS}>
						{(option) => <option value={option.value}>{option.label}</option>}
					</For>
				</Select>
			</Field>
			<Field label="Minimum messages">
				<TextInput
					type="number"
					min="0"
					step="1"
					value={props.minimumMessages()}
					placeholder="0"
					onInput={(event) => props.onMinimumMessages(event.currentTarget.value)}
				/>
			</Field>
			<Button variant="secondary" disabled={!props.conversationFiltersActive()} onClick={props.onClearFilters}>
				Clear filters
			</Button>
		</div>
	</div>
);

const formatDate = (date: Date | undefined): string => {
	if (!date || Number.isNaN(date.getTime())) return "Unavailable";
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const typeBadgeClass = (isGroup: boolean) =>
	isGroup ? "border-purple-line bg-purple-fill/55 text-purple-soft" : "border-edge-strong text-gray-400";

const SenderStatistics: Component<{ stats: Resource<ConversationSenderStat[]> }> = (props) => (
	<div class="border-t border-edge bg-surface/60 px-5 py-4">
		<h2 class="mb-3 font-sans text-sm font-semibold text-gray-100">Messages by person</h2>
		<Show when={!props.stats.loading} fallback={<p class="text-sm text-gray-400">Loading stats…</p>}>
			<Show
				when={!props.stats.error}
				fallback={<p class="text-sm text-red-soft">Couldn’t load stats for this conversation.</p>}
			>
				<Show
					when={(props.stats()?.length ?? 0) > 0}
					fallback={<p class="text-sm text-gray-500">No messages found.</p>}
				>
					<div class="max-h-[50vh] overflow-y-auto rounded-lg border border-edge">
						<table class="w-full text-sm">
							<thead class="sticky top-0 bg-surface text-left text-xs uppercase tracking-wider text-gray-400">
								<tr>
									<th class="px-4 py-2">Person</th>
									<th class="px-4 py-2 text-right">Messages</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-edge">
								<For each={props.stats()}>
									{(stat) => (
										<tr>
											<td class="px-4 py-2.5 text-gray-100">{stat.sender}</td>
											<td class="px-4 py-2.5 text-right font-semibold text-purple-soft">
												{stat.count.toLocaleString()}
											</td>
										</tr>
									)}
								</For>
							</tbody>
						</table>
					</div>
				</Show>
			</Show>
		</Show>
	</div>
);

interface ConversationRowItemProps {
	conversation: ConversationRow;
	selected: () => boolean;
	stats: Resource<ConversationSenderStat[]>;
	onClick: (conversation: ConversationRow) => void;
}

const ConversationRowItem: Component<ConversationRowItemProps> = (props) => (
	<>
		<button
			type="button"
			class="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-4 text-left transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple sm:grid-cols-[minmax(0,1fr)_110px_120px_150px_16px] sm:items-center sm:gap-4"
			aria-expanded={props.selected()}
			onClick={() => props.onClick(props.conversation)}
		>
			<div class="min-w-0">
				<p class="truncate font-semibold text-gray-100">
					{props.conversation.title || "Untitled conversation"}
				</p>
				<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
					<span
						class={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 ${typeBadgeClass(props.conversation.is_group)}`}
					>
						{props.conversation.is_group ? "Group" : "Direct"}
					</span>
					<span class="text-xs text-gray-400">
						<span class="font-mono text-gray-400">{props.conversation.messageCount.toLocaleString()}</span>{" "}
						messages
					</span>
					<span class="text-xs text-gray-400">Active {formatDate(props.conversation.lastActivity)}</span>
				</div>
				<p class="mt-1.5 truncate text-xs text-gray-400">
					{props.conversation.participants.length > 0
						? props.conversation.participants.join(", ")
						: "Participants unavailable"}
				</p>
			</div>
			<span
				class={`hidden justify-self-start sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5 ${typeBadgeClass(props.conversation.is_group)}`}
			>
				{props.conversation.is_group ? "Group" : "Direct"}
			</span>
			<span class="hidden font-mono text-sm font-medium text-purple-soft sm:block">
				{props.conversation.messageCount.toLocaleString()}
			</span>
			<span class="hidden font-mono text-sm text-gray-400 sm:block">
				{formatDate(props.conversation.lastActivity)}
			</span>
			<span class="flex items-center justify-end text-gray-400" aria-hidden="true">
				<svg
					class={`h-4 w-4 transition-transform duration-150 ${props.selected() ? "rotate-180" : ""}`}
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
				>
					<path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</span>
		</button>
		<Show when={props.selected()}>
			<SenderStatistics stats={props.stats} />
		</Show>
	</>
);

const ConversationsTab: Component<ConversationsTabProps> = (props) => (
	<section class="space-y-5">
		<PageHeading
			title="Conversations"
			description="A quick look at your message activity in this export."
			trailing={
				<div class="flex items-baseline gap-1.5 text-sm text-gray-400">
					<span class="font-mono text-sm font-medium text-gray-100">
						{props.filteredConversations.length.toLocaleString()}
					</span>
					results
				</div>
			}
		/>

		<ConversationFilters
			conversationSearch={props.conversationSearch}
			conversationType={props.conversationType}
			minimumMessages={props.minimumMessages}
			conversationFiltersActive={props.conversationFiltersActive}
			onConversationSearch={props.onConversationSearch}
			onConversationType={props.onConversationType}
			onMinimumMessages={props.onMinimumMessages}
			onClearFilters={props.onClearFilters}
		/>

		<Show
			when={props.conversations.length > 0}
			fallback={
				<EmptyState
					title="Conversation data unavailable"
					description="No message conversations were included in this data package."
				/>
			}
		>
			<Show
				when={props.filteredConversations.length > 0}
				fallback={
					<EmptyState
						title="No conversations match"
						description="Try a different search, type, or minimum message count."
					/>
				}
			>
				<Panel class="overflow-hidden">
					<div class="hidden grid-cols-[minmax(0,1fr)_110px_120px_150px_16px] gap-4 border-b border-edge bg-surface px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 sm:grid">
						<span>Conversation</span>
						<span>Type</span>
						<span>Messages</span>
						<span>Last activity</span>
						<span aria-hidden="true" />
					</div>
					<div class="divide-y divide-edge">
						<For each={props.filteredConversations}>
							{(conversation) => (
								<ConversationRowItem
									conversation={conversation}
									selected={() => props.selectedConversation() === conversation.title}
									stats={props.conversationStats}
									onClick={props.onConversationClick}
								/>
							)}
						</For>
					</div>
				</Panel>
			</Show>
		</Show>
	</section>
);

export default ConversationsTab;
