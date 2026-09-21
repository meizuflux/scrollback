import { type Component } from "solid-js";

export interface EmptyStateProps {
	title: string;
	description: string;
	class?: string;
}

export const EmptyState: Component<EmptyStateProps> = (props) => (
	<div
		class={`rounded-[0.875rem] border border-edge bg-panel px-6 py-12 text-center shadow-panel ${props.class ?? ""}`}
	>
		<p class="text-lg font-semibold text-gray-100">{props.title}</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-gray-400">{props.description}</p>
	</div>
);

export interface LoadingStateProps {
	label?: string;
	class?: string;
}

export const LoadingState: Component<LoadingStateProps> = (props) => (
	<div
		class={`rounded-[0.875rem] border border-edge bg-panel px-6 py-14 text-center text-gray-400 shadow-panel ${props.class ?? ""}`}
	>
		{props.label || "Loading…"}
	</div>
);
