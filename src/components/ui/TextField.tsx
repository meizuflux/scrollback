import { type Component, type JSX, splitProps } from "solid-js";

const inputBaseClass =
	"w-full min-h-10 cursor-text rounded-[0.625rem] border border-edge-strong bg-surface px-3 py-2.5 text-sm leading-5 text-gray-100 outline-none transition-[border-color,background-color] placeholder:text-gray-500 hover:border-gray-500 focus:border-purple focus-visible:outline-2 focus-visible:outline-purple";

export interface TextInputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
	class?: string;
}

export const TextInput: Component<TextInputProps> = (props) => {
	const [local, others] = splitProps(props, ["class"]);
	return <input class={`${inputBaseClass} ${local.class ?? ""}`} {...others} />;
};

const selectBaseClass =
	"w-full min-h-10 cursor-pointer rounded-[0.625rem] border border-edge-strong bg-surface px-3 py-2.5 text-sm leading-5 text-gray-100 outline-none transition-[border-color,background-color] hover:border-gray-500 focus:border-purple focus-visible:outline-2 focus-visible:outline-purple";

export interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
	class?: string;
}

export const Select: Component<SelectProps> = (props) => {
	const [local, others] = splitProps(props, ["class", "children"]);
	return (
		<select class={`${selectBaseClass} ${local.class ?? ""}`} {...others}>
			{local.children}
		</select>
	);
};
