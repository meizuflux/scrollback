import type { Component } from "solid-js";

export const InfoTooltip: Component<{ label: string; description: string }> = (props) => (
	<span
		class="group relative inline-flex align-middle"
		title={props.description}
		role="img"
		aria-label={`${props.label}: ${props.description}`}
	>
		<span class="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-500 text-[10px] font-bold leading-none text-gray-400 outline-none transition-colors group-hover:border-gray-400 group-hover:text-gray-100 focus-visible:border-purple focus-visible:text-gray-100">
			?
		</span>
		<span
			role="tooltip"
			class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-left text-xs font-normal leading-5 text-gray-100 shadow-lg group-hover:block"
		>
			{props.description}
		</span>
	</span>
);

export const EmptyState: Component<{ title: string; description: string }> = (props) => (
	<div class="rounded-lg border border-gray-700 bg-gray-900 px-6 py-12 text-center">
		<p class="text-lg font-semibold text-gray-100">{props.title}</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-gray-400">{props.description}</p>
	</div>
);

export const ControlLabel: Component<{ label: string; children: any }> = (props) => (
	<label class="flex min-w-0 flex-col gap-2 text-sm font-medium text-gray-400">
		<span>{props.label}</span>
		{props.children}
	</label>
);

export const controlClass =
	"w-full min-h-10 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm leading-5 text-gray-100 outline-none placeholder:text-gray-500 transition-colors hover:border-gray-600 focus:border-purple focus:bg-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple";
