import { type Component, type JSX, splitProps } from "solid-js";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
	primary: "border-purple bg-purple text-purple-fill hover:border-purple-soft hover:bg-purple-soft",
	secondary: "border-edge-strong bg-transparent text-gray-100 hover:border-purple-line hover:bg-purple-fill",
	danger: "border-red-line bg-transparent text-red-soft hover:border-red hover:bg-red-fill",
	ghost: "border-purple-line bg-purple-fill/40 text-purple-soft hover:border-purple-line hover:bg-purple-fill",
};

const sizeClass: Record<ButtonSize, string> = {
	md: "px-4 py-2.5 text-sm leading-5",
	sm: "min-h-9 px-3 py-1.5 text-sm leading-5",
};

const baseClass =
	"inline-flex cursor-pointer items-center justify-center gap-2 rounded-[0.625rem] border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-not-allowed disabled:opacity-50";

export const Button: Component<ButtonProps> = (props) => {
	const [local, others] = splitProps(props, ["variant", "size", "class"]);
	return (
		<button
			type="button"
			class={`${baseClass} ${sizeClass[local.size ?? "md"]} ${variantClass[local.variant ?? "secondary"]} ${local.class ?? ""}`}
			{...others}
		/>
	);
};
