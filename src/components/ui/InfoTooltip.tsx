import { createEffect, createSignal, createUniqueId, onCleanup, Show, type Component } from "solid-js";

export interface InfoTooltipProps {
	label: string;
	description: string;
}

export const InfoTooltip: Component<InfoTooltipProps> = (props) => {
	const id = createUniqueId();
	const [open, setOpen] = createSignal(false);
	let wrapperRef: HTMLSpanElement | undefined;

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			setOpen(true);
		} else if (event.key === "Escape") {
			setOpen(false);
		}
	};

	createEffect(() => {
		if (!open()) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!wrapperRef?.contains(target)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		onCleanup(() => document.removeEventListener("pointerdown", onPointerDown));
	});

	return (
		<span
			ref={wrapperRef}
			class="relative inline-flex align-middle"
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
		>
			<button
				type="button"
				id={`${id}-trigger`}
				aria-label={`${props.label}: ${props.description}`}
				aria-describedby={`${id}-panel`}
				aria-expanded={open()}
				onClick={(event) => {
					event.stopPropagation();
					setOpen((value) => !value);
				}}
				onKeyDown={onKeyDown}
				onFocus={() => setOpen(true)}
				onBlur={() => setOpen(false)}
				class="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-600 text-[10px] font-bold leading-none text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-100 focus-visible:border-purple focus-visible:outline-2 focus-visible:outline-purple focus-visible:text-gray-100"
			>
				?
			</button>
			<Show when={open()}>
				<span
					id={`${id}-panel`}
					role="tooltip"
					class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 max-w-[80vw] -translate-x-1/2 rounded-lg border border-edge bg-raised px-3 py-2 text-left font-space-grotesk text-xs font-normal normal-case tracking-normal leading-5 text-gray-100 shadow-raised"
				>
					{props.description}
				</span>
			</Show>
		</span>
	);
};
