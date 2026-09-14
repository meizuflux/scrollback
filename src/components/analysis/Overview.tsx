import { Component, For, Show } from "solid-js";
import { CachedAnalysis } from "@/types/analysis";
import { InfoTooltip } from "@/components/analysis/AnalysisShared";

interface StatCardProps {
	title: string;
	value: number | string;
	description?: string;
	accent?: "pink" | "purple";
}

const accentClasses = {
	pink: "border-t-pink hover:border-pink",
	purple: "border-t-purple hover:border-purple",
} as const;

const StatCard: Component<StatCardProps> = (props) => {
	const accentClass = () => accentClasses[props.accent || "pink"];

	return (
		<div
			class={`rounded-lg border border-gray-600/50 border-t-[3px] bg-[linear-gradient(145deg,rgba(32,32,32,0.96),rgba(24,24,24,0.92))] p-5 transition-colors ${accentClass()}`}
		>
			<p class="text-sm font-medium text-gray-400">
				{props.title}
				{props.description && <InfoTooltip label={props.title} description={props.description} />}
			</p>
			<p class="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-gray-100">{props.value}</p>
		</div>
	);
};

const SectionHeading: Component<{ children: any }> = (props) => (
	<div class="flex items-center gap-4">
		<h2 class="font-sans text-lg font-semibold text-white">{props.children}</h2>
		<div class="h-px flex-1 bg-[linear-gradient(90deg,rgba(255,110,196,0.45),rgba(115,115,115,0.35),transparent)]" />
	</div>
);

const Overview: Component<{ analysis: CachedAnalysis }> = (props) => {
	const formatNumber = (num: number | undefined) => {
		if (num === undefined) return "Unavailable";
		return num.toLocaleString();
	};

	return (
		<div class="space-y-8">
			<div class="mb-8">
				<h1 class="mb-3 font-sans text-3xl font-semibold tracking-tight text-white">Highlights</h1>
				<p class="text-base text-gray-400">Quick stats about your Instagram activity.</p>
			</div>

			<section class="space-y-4">
				<SectionHeading>Messages</SectionHeading>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Total messages"
						value={formatNumber(props.analysis.messageCount)}
						accent="purple"
					/>
					<StatCard title="Messages sent" value={formatNumber(props.analysis.messagesSent)} accent="pink" />
					<StatCard
						title="Messages received"
						value={formatNumber(props.analysis.messagesReceived)}
						accent="pink"
					/>
					<StatCard
						title="System messages"
						value={formatNumber(props.analysis.systemMessages)}
						accent="purple"
						description="Messages Instagram sends automatically, such as “You created a group”."
					/>
				</div>
			</section>

			<section class="space-y-4">
				<SectionHeading>Conversations</SectionHeading>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="grid grid-cols-1 gap-4">
						<StatCard
							title="Total conversations"
							value={formatNumber(props.analysis.conversationCount)}
							accent="purple"
						/>
						<StatCard title="Group chats" value={formatNumber(props.analysis.groupCount)} accent="pink" />
					</div>
					<div class="rounded-lg border border-purple/40 bg-[radial-gradient(circle_at_100%_0%,rgba(120,115,245,0.1),transparent_12rem),rgba(24,24,24,0.92)] p-5">
						<h3 class="mb-4 font-sans text-base font-semibold text-white">Top conversations</h3>
						<Show
							when={
								props.analysis.topThreeConversations && props.analysis.topThreeConversations.length > 0
							}
							fallback={
								<p class="text-sm text-gray-400">
									{props.analysis.topThreeConversations === undefined
										? "Unavailable"
										: "No conversations found"}
								</p>
							}
						>
							<div class="space-y-2">
								<For each={props.analysis.topThreeConversations}>
									{(conversation, index) => (
										<div class="flex items-center justify-between gap-4 rounded-lg border border-gray-600/45 bg-gray-800/60 p-3 transition-colors hover:border-purple/60 hover:bg-purple/10">
											<div class="flex min-w-0 items-center gap-3">
												<span class="text-sm text-gray-500">#{index() + 1}</span>
												<span class="truncate text-sm font-medium text-gray-100">
													{conversation.title}
												</span>
											</div>
											<span class="shrink-0 bg-gradient-to-r from-pink to-purple bg-clip-text text-sm font-semibold text-transparent">
												{formatNumber(conversation.count)}
											</span>
										</div>
									)}
								</For>
							</div>
						</Show>
					</div>
				</div>
			</section>

			<section class="space-y-4">
				<SectionHeading>Social activity</SectionHeading>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Followers"
						value={formatNumber(props.analysis.followers)}
						accent="pink"
						description="This may be lower than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
					/>
					<StatCard
						title="Following"
						value={formatNumber(props.analysis.following)}
						accent="purple"
						description="This may be lower than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data."
					/>
					<StatCard title="Reactions sent" value={formatNumber(props.analysis.reactionsSent)} accent="pink" />
					<StatCard
						title="Reactions received"
						value={formatNumber(props.analysis.reactionsReceived)}
						accent="purple"
					/>
				</div>
			</section>
		</div>
	);
};

export default Overview;
