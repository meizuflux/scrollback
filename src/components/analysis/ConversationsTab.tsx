import { For, Show, type Component } from "solid-js";
import { ControlLabel, EmptyState, controlClass } from "@/components/analysis/AnalysisShared";
import type { ConversationRow, ConversationSenderStat, ConversationTypeFilter } from "@/components/analysis/analysisTypes";

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
	conversationStats: () => ConversationSenderStat[];
	conversationStatsLoading: () => boolean;
	onConversationClick: (conversation: ConversationRow) => void;
}

const formatDate = (date: Date | undefined) => {
	if (!date || Number.isNaN(date.getTime())) return "Unavailable";
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const ConversationsTab: Component<ConversationsTabProps> = (props) => (
	<section class="space-y-5">
		<div>
			<p class="mb-3 bg-gradient-to-r from-[#FF6EC4] to-[#7873F5] bg-clip-text text-xs font-bold uppercase tracking-[0.16em] leading-4 text-transparent">
				Message history
			</p>
			<div class="flex flex-col justify-between gap-3 md:flex-row md:items-end">
				<div>
					<h1 class="text-3xl font-semibold tracking-tight text-[#F2F2F2]">Conversations</h1>
					<p class="mt-2 text-[#A3A3A3]">A quick look at your message activity in this export.</p>
				</div>
				<div class="text-sm text-[#A3A3A3]">
					<span class="font-semibold text-[#F2F2F2]">
						{props.filteredConversations.length.toLocaleString()}
					</span>{" "}
					results
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-[#303030] bg-[#181818] p-4">
			<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end">
				<ControlLabel label="Search conversations">
					<input
						class={controlClass}
						type="search"
						value={props.conversationSearch()}
						placeholder="Search title or participant"
						onInput={(event) => props.onConversationSearch(event.currentTarget.value)}
					/>
				</ControlLabel>
				<ControlLabel label="Type">
					<select
						class={controlClass}
						value={props.conversationType()}
						onChange={(event) =>
							props.onConversationType(event.currentTarget.value as ConversationTypeFilter)
						}
					>
						<option value="all">All types</option>
						<option value="direct">Direct</option>
						<option value="group">Group</option>
					</select>
				</ControlLabel>
				<ControlLabel label="Minimum messages">
					<input
						class={controlClass}
						type="number"
						min="0"
						step="1"
						value={props.minimumMessages()}
						placeholder="0"
						onInput={(event) => props.onMinimumMessages(event.currentTarget.value)}
					/>
				</ControlLabel>
				<button
					type="button"
					class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#404040] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5] disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!props.conversationFiltersActive()}
					onClick={props.onClearFilters}
				>
					Clear filters
				</button>
			</div>
		</div>

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
				<div class="overflow-hidden rounded-lg border border-[#303030] bg-[#181818]">
					<div class="hidden grid-cols-[minmax(0,1fr)_120px_140px_130px] gap-4 border-b border-[#303030] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#737373] sm:grid">
						<span>Conversation</span>
						<span>Type</span>
						<span>Messages</span>
						<span>Last activity</span>
					</div>
					<div class="divide-y divide-[#303030]">
						<For each={props.filteredConversations}>
							{(conversation) => (
								<>
								<button
									type="button"
									class="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-4 text-left transition-colors hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#7873F5] sm:grid-cols-[minmax(0,1fr)_120px_140px_130px_auto] sm:items-center sm:gap-4"
									aria-expanded={props.selectedConversation() === conversation.title}
									onClick={() => props.onConversationClick(conversation)}
								>
									<div class="min-w-0">
										<p class="truncate font-semibold text-[#F2F2F2]">
											{conversation.title || "Untitled conversation"}
										</p>
										<p class="mt-1 truncate text-xs text-[#737373]">
											{conversation.participants.length > 0
												? conversation.participants.join(", ")
												: "Participants unavailable"}
										</p>
									</div>
									<span class="text-sm text-[#A3A3A3]">
										<span class="mr-1 text-[#737373] sm:hidden">Type ·</span>
										{conversation.is_group ? "Group" : "Direct"}
									</span>
									<span class="text-sm font-semibold text-[#7873F5]">
										<span class="mr-1 text-[#737373] sm:hidden">Messages ·</span>
										{conversation.messageCount.toLocaleString()}
									</span>
									<span class="text-sm text-[#A3A3A3]">
										<span class="mr-1 text-[#737373] sm:hidden">Active ·</span>
										{formatDate(conversation.lastActivity)}
									</span>
									<span class="flex items-center justify-end text-[#A3A3A3]" aria-hidden="true">
										<svg
											class={`h-5 w-5 transition-transform ${props.selectedConversation() === conversation.title ? "rotate-180" : ""}`}
											viewBox="0 0 20 20"
											fill="none"
											stroke="currentColor"
											stroke-width="1.75"
										>
											<path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
										</svg>
									</span>
								</button>
								<Show when={props.selectedConversation() === conversation.title}>
									<div class="border-t border-[#303030] bg-[#141414] px-5 py-4">
										<h2 class="mb-3 text-sm font-semibold text-[#F2F2F2]">Messages by person</h2>
										<Show when={!props.conversationStatsLoading()} fallback={<p class="text-sm text-[#A3A3A3]">Loading stats…</p>}>
											<Show when={props.conversationStats().length > 0} fallback={<p class="text-sm text-[#737373]">No messages found.</p>}>
												<div class="max-h-[50vh] overflow-y-auto rounded-md border border-[#303030]">
													<table class="w-full text-sm"><thead class="sticky top-0 bg-[#202020] text-left text-xs uppercase tracking-wider text-[#737373]"><tr><th class="px-4 py-2">Person</th><th class="px-4 py-2 text-right">Messages</th></tr></thead><tbody class="divide-y divide-[#303030]"><For each={props.conversationStats()}>{(stat) => <tr><td class="px-4 py-2.5 text-[#F2F2F2]">{stat.sender}</td><td class="px-4 py-2.5 text-right font-semibold text-[#7873F5]">{stat.count.toLocaleString()}</td></tr>}</For></tbody></table>
												</div>
											</Show>
										</Show>
									</div>
								</Show>
								</>
							)}
						</For>
					</div>
				</div>
			</Show>
		</Show>
	</section>
);

export default ConversationsTab;
