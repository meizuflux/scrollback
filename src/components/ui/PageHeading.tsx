import { type Component, type JSX } from "solid-js";

export interface PageHeadingProps {
	title: string;
	description?: string;
	trailing?: JSX.Element;
}

export const PageHeading: Component<PageHeadingProps> = (props) => (
	<div class="flex flex-col justify-between gap-3 md:flex-row md:items-end">
		<div class="min-w-0">
			<h1 class="font-sans text-3xl font-semibold tracking-tight text-gray-100">{props.title}</h1>
			{props.description && <p class="mt-2 text-gray-400">{props.description}</p>}
		</div>
		{props.trailing}
	</div>
);
