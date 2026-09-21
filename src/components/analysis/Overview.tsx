import { Component } from "solid-js";
import type { CachedAnalysis } from "@/types/analysis";
import { PageHeading } from "@/components/ui";
import { MessagesSummary, PairedMetric, RankedList } from "@/components/analysis/Metrics";

const Overview: Component<{ analysis: CachedAnalysis }> = (props) => {
	const relationshipTooltip =
		"This may be lower than Instagram’s count because deactivated or otherwise unavailable accounts may not appear in the data.";

	const topRows = () =>
		(props.analysis.topConversations || []).map((conversation, index) => ({
			rank: index + 1,
			title: conversation.title,
			count: conversation.count,
		}));

	return (
		<section class="space-y-5">
			<PageHeading title="Highlights" description="Quick stats about your Instagram activity." />

			<div class="grid gap-5 lg:grid-cols-12">
				<div class="lg:col-span-7">
					<MessagesSummary
						messageCount={props.analysis.messageCount}
						messagesSent={props.analysis.messagesSent}
						messagesReceived={props.analysis.messagesReceived}
						systemMessages={props.analysis.systemMessages}
						conversationCount={props.analysis.conversationCount}
						groupCount={props.analysis.groupCount}
					/>
				</div>

				<div class="lg:col-span-5">
					<RankedList
						title="Top conversations"
						rows={topRows()}
						emptyLabel={
							props.analysis.topConversations === undefined ? "Unavailable" : "No conversations found"
						}
					/>
				</div>

				<div class="lg:col-span-6">
					<PairedMetric
						title="Social connections"
						left={{
							label: "Followers",
							value: props.analysis.followers,
							accent: "blue",
							tooltip: relationshipTooltip,
						}}
						right={{
							label: "Following",
							value: props.analysis.following,
							accent: "pink",
							tooltip: relationshipTooltip,
						}}
					/>
				</div>

				<div class="lg:col-span-6">
					<PairedMetric
						title="Reactions"
						left={{
							label: "Sent",
							value: props.analysis.reactionsSent,
							accent: "pink",
						}}
						right={{
							label: "Received",
							value: props.analysis.reactionsReceived,
							accent: "blue",
						}}
					/>
				</div>
			</div>
		</section>
	);
};

export default Overview;
