import { A, type AnchorProps } from "@solidjs/router";
import { splitProps } from "solid-js";

export type NavigationLinkVariant = "primary" | "secondary";

export interface NavigationLinkProps extends AnchorProps {
	variant?: NavigationLinkVariant;
	class?: string;
}

const baseClass =
	"inline-flex cursor-pointer items-center justify-center gap-2 rounded-[0.625rem] border px-4 py-2.5 text-sm font-semibold leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple";

const variantClass: Record<NavigationLinkVariant, string> = {
	primary: "border-purple bg-purple text-purple-fill hover:border-purple-soft hover:bg-purple-soft",
	secondary: "border-edge-strong bg-transparent text-gray-100 hover:border-purple-line hover:bg-purple-fill",
};

export const NavigationLink = (props: NavigationLinkProps) => {
	const [local, others] = splitProps(props, ["variant", "class"]);
	return <A class={`${baseClass} ${variantClass[local.variant ?? "secondary"]} ${local.class ?? ""}`} {...others} />;
};
