import { type Component, type JSX, splitProps } from "solid-js";

export type PanelVariant = "standard" | "raised";

export interface PanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
	variant?: PanelVariant;
}

const baseClass = "rounded-[0.875rem] border border-edge";

const variantClass: Record<PanelVariant, string> = {
	standard: "bg-panel shadow-panel",
	raised: "bg-raised shadow-raised bg-[linear-gradient(180deg,rgb(131_124_247/0.07),transparent_55%)]",
};

export const Panel: Component<PanelProps> = (props) => {
	const [local, others] = splitProps(props, ["variant", "class"]);
	return <div class={`${baseClass} ${variantClass[local.variant ?? "standard"]} ${local.class ?? ""}`} {...others} />;
};
