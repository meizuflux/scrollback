import { type Component, type JSX } from "solid-js";

export interface FieldProps {
	label: string;
	class?: string;
	children?: JSX.Element;
}

export const Field: Component<FieldProps> = (props) => (
	<label class={`flex min-w-0 flex-col gap-2 text-sm font-medium text-gray-400 ${props.class ?? ""}`}>
		<span>{props.label}</span>
		{props.children}
	</label>
);
