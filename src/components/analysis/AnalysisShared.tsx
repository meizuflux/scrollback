import type { Component } from "solid-js";

export const InfoTooltip: Component<{ label: string; description: string }> = (props) => (
	<span
		class="group relative inline-flex align-middle"
		title={props.description}
		role="img"
		aria-label={`${props.label}: ${props.description}`}
	>
		<span class="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-[#737373] text-[10px] font-bold leading-none text-[#A3A3A3] outline-none transition-colors group-hover:border-[#B8B8B8] group-hover:text-[#F2F2F2] focus-visible:border-[#7873F5] focus-visible:text-[#F2F2F2]">
			?
		</span>
		<span
			role="tooltip"
			class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-[#404040] bg-[#242424] px-3 py-2 text-left text-xs font-normal leading-5 text-[#F2F2F2] shadow-lg group-hover:block"
		>
			{props.description}
		</span>
	</span>
);

export const EmptyState: Component<{ title: string; description: string }> = (props) => (
	<div class="rounded-lg border border-[#303030] bg-[#181818] px-6 py-12 text-center">
		<p class="text-lg font-semibold text-[#F2F2F2]">{props.title}</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-[#A3A3A3]">{props.description}</p>
	</div>
);

export const ControlLabel: Component<{ label: string; children: any }> = (props) => (
	<label class="flex min-w-0 flex-col gap-2 text-sm font-medium text-[#A3A3A3]">
		<span>{props.label}</span>
		{props.children}
	</label>
);

export const controlClass =
	"w-full min-h-10 rounded-lg border border-[#303030] bg-[#141414] px-3 py-2.5 text-sm leading-5 text-[#F2F2F2] outline-none placeholder:text-[#737373] transition-colors hover:border-[#4A4A4A] focus:border-[#7873F5] focus:bg-[#181818] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]";
