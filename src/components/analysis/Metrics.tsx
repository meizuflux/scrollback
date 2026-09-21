import { type Component, type JSX, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { InfoTooltip, Panel } from "@/components/ui";

export type Accent = "pink" | "blue" | "purple" | "neutral";

const accentDot: Record<Accent, string> = {
	pink: "bg-pink",
	blue: "bg-blue",
	purple: "bg-purple",
	neutral: "bg-gray-500",
};

const accentText: Record<Accent, string> = {
	pink: "text-pink-soft",
	blue: "text-blue-soft",
	purple: "text-purple-soft",
	neutral: "text-gray-400",
};

const accentValue: Record<Accent, string> = {
	pink: "text-pink-soft",
	blue: "text-blue-soft",
	purple: "text-purple-soft",
	neutral: "text-gray-100",
};

export const formatCount = (value: number | undefined): string =>
	value === undefined ? "Unavailable" : value.toLocaleString();

export interface MetricSpec {
	label: string;
	value: number | undefined;
	accent?: Accent;
	tooltip?: string;
	quiet?: boolean;
}

export const MetricBlock: Component<{ spec: MetricSpec; size?: "md" | "lg" }> = (props) => {
	const available = () => props.spec.value !== undefined;
	const accent = () => props.spec.accent || "neutral";

	const labelClass = () => (props.spec.quiet ? "text-gray-400" : accentText[accent()]);
	const dotClass = () => (props.spec.quiet ? "bg-gray-500" : accentDot[accent()]);
	const valueClass = () => {
		if (!available()) return "text-sm font-normal leading-5 text-gray-500";
		const sizeClass = props.size === "lg" ? "text-2xl leading-8" : "text-xl leading-7";
		return `${sizeClass} ${props.spec.quiet ? "text-gray-400" : accentValue[accent()]}`;
	};

	return (
		<div class="min-w-0">
			<dt class={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${labelClass()}`}>
				<span aria-hidden="true" class={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass()}`} />
				<span>{props.spec.label}</span>
				{props.spec.tooltip && <InfoTooltip label={props.spec.label} description={props.spec.tooltip} />}
			</dt>
			<dd class={`mt-1.5 font-mono ${valueClass()}`}>{formatCount(props.spec.value)}</dd>
		</div>
	);
};

export const PairedMetric: Component<{
	title: string;
	description?: string;
	left: MetricSpec;
	right: MetricSpec;
	size?: "md" | "lg";
}> = (props) => (
	<Panel class="flex h-full flex-col p-5 sm:p-6">
		<div class="flex items-center gap-2">
			<h2 class="text-sm font-semibold tracking-tight text-gray-100">{props.title}</h2>
			{props.description && <InfoTooltip label={props.title} description={props.description} />}
		</div>
		<dl class="mt-5 grid grid-cols-2 gap-4 sm:gap-5">
			<MetricBlock spec={props.left} size={props.size} />
			<MetricBlock spec={props.right} size={props.size} />
		</dl>
	</Panel>
);

export const SummaryPanel: Component<{
	title?: string;
	description?: string;
	items: MetricSpec[];
	strip?: boolean;
	columns?: 2 | 4;
}> = (props) => {
	const hasTitle = () => Boolean(props.title || props.description);
	const bodyClass = () => {
		if (props.strip) {
			return `grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 ${hasTitle() ? "mt-5" : ""}`;
		}
		return `grid grid-cols-1 gap-6 sm:grid-cols-2 ${props.columns === 4 ? "lg:grid-cols-4" : ""} ${
			hasTitle() ? "mt-5" : ""
		}`;
	};
	return (
		<Panel class="p-5 sm:p-6">
			{hasTitle() && (
				<div class="flex items-center gap-2">
					{props.title && <h2 class="text-sm font-semibold tracking-tight text-gray-100">{props.title}</h2>}
					{props.description && (
						<InfoTooltip label={props.title || "Information"} description={props.description} />
					)}
				</div>
			)}
			<dl class={bodyClass()}>
				<For each={props.items}>{(spec) => <MetricBlock spec={spec} />}</For>
			</dl>
		</Panel>
	);
};

export interface RankedListRow {
	rank: number;
	title: string;
	count: number | undefined;
}

export const RankedList: Component<{
	title: string;
	description?: string;
	rows: RankedListRow[];
	emptyLabel?: string;
	footer?: JSX.Element;
}> = (props) => (
	<Panel class="flex h-full flex-col p-5 sm:p-6">
		<div class="flex items-center gap-2">
			<h2 class="text-sm font-semibold tracking-tight text-gray-100">{props.title}</h2>
			{props.description && <InfoTooltip label={props.title} description={props.description} />}
		</div>
		<Show
			when={props.rows.length > 0}
			fallback={<p class="mt-5 text-sm text-gray-500">{props.emptyLabel || "No data available"}</p>}
		>
			<ol class="mt-4 flex-1 space-y-1">
				<For each={props.rows}>
					{(row) => (
						<li class="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2.5">
							<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-edge-strong bg-surface font-mono text-xs font-medium text-gray-400">
								{row.rank}
							</span>
							<span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-100" title={row.title}>
								{row.title}
							</span>
							<span class="shrink-0 font-mono text-sm font-semibold text-gray-100">
								{formatCount(row.count)}
							</span>
						</li>
					)}
				</For>
			</ol>
		</Show>
		{props.footer && (
			<div class="mt-4 border-t border-edge pt-4">
				<div class="grid grid-cols-2 gap-4">{props.footer}</div>
			</div>
		)}
	</Panel>
);

export const ActionPanel: Component<{
	label: string;
	value: number | undefined;
	description?: string;
	accent?: Accent;
	actionLabel: string;
	href?: string;
	onClick?: () => void;
}> = (props) => {
	const accent = () => props.accent || "purple";
	const className =
		"group flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-edge bg-panel p-4 text-left transition-colors hover:border-purple-line hover:bg-purple-fill/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple";
	const content = (
		<>
			<div class="min-w-0">
				<p
					class={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${
						accentText[accent()]
					}`}
				>
					<span aria-hidden="true" class={`h-1.5 w-1.5 shrink-0 rounded-full ${accentDot[accent()]}`} />
					<span>{props.label}</span>
				</p>
				<p
					class={
						props.value === undefined
							? "mt-2 text-sm font-medium text-gray-500"
							: "mt-2 font-mono text-2xl font-medium leading-8 text-gray-100"
					}
				>
					{formatCount(props.value)}
				</p>
			</div>
			<span class="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-400 transition-colors group-hover:text-purple-soft">
				{props.actionLabel}
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
					<path d="m8 5 5 5-5 5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" />
				</svg>
			</span>
		</>
	);
	if (props.href) {
		return (
			<A class={className} href={props.href} title={props.description} activeClass="" inactiveClass="">
				{content}
			</A>
		);
	}
	return (
		<button type="button" class={className} title={props.description} onClick={props.onClick}>
			{content}
		</button>
	);
};

export interface MessagesSummaryProps {
	messageCount: number | undefined;
	messagesSent: number | undefined;
	messagesReceived: number | undefined;
	systemMessages: number | undefined;
	conversationCount: number | undefined;
	groupCount: number | undefined;
}

const systemTooltip = "Messages Instagram sends automatically, such as “You created a group”.";
const groupTooltip = "Conversations with more than two participants.";

export const MessagesSummary: Component<MessagesSummaryProps> = (props) => {
	const available = () => props.messageCount !== undefined;
	return (
		<section class="flex h-full flex-col rounded-[0.875rem] border border-edge bg-raised p-5 shadow-raised bg-[linear-gradient(180deg,rgb(131_124_247/0.07),transparent_55%)] sm:p-7">
			<div class="flex items-center gap-2 text-sm font-medium text-gray-400">
				<h2 class="text-sm font-medium text-gray-400">Messages</h2>
			</div>
			<p
				class={`mt-3 font-sans ${
					available()
						? "text-5xl font-semibold leading-none tracking-tight text-gray-100 sm:text-6xl"
						: "text-xl font-medium leading-6 text-gray-500"
				}`}
			>
				{formatCount(props.messageCount)}
			</p>
			<dl class="mt-6 grid grid-cols-2 gap-4 border-t border-edge pt-4 sm:mt-8 sm:gap-6 sm:pt-5">
				<MetricBlock spec={{ label: "Sent", value: props.messagesSent, accent: "pink" }} />
				<MetricBlock spec={{ label: "Received", value: props.messagesReceived, accent: "blue" }} />
			</dl>
			<div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
				<span class="inline-flex items-center gap-1.5">
					<span aria-hidden="true" class="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-500" />
					<span
						class={
							props.systemMessages === undefined ? "text-gray-500" : "font-mono font-medium text-gray-400"
						}
					>
						{formatCount(props.systemMessages)}
					</span>
					<span>system messages</span>
					<InfoTooltip label="System" description={systemTooltip} />
				</span>
			</div>
			<dl class="mt-6 grid grid-cols-2 gap-4 border-t border-edge pt-4 sm:mt-8 sm:gap-6 sm:pt-5">
				<MetricBlock
					spec={{ label: "Total conversations", value: props.conversationCount, accent: "purple" }}
				/>
				<MetricBlock spec={{ label: "Group chats", value: props.groupCount, tooltip: groupTooltip }} />
			</dl>
		</section>
	);
};
