import { type Component, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { isDataLoaded } from "@/utils/storage";
import Layout from "@/components/Layout";
import { NavigationLink, Panel } from "@/components/ui";

const Export: Component = () => {
	const navigate = useNavigate();

	onMount(() => {
		if (!isDataLoaded()) {
			navigate("/", { replace: true });
		}
	});

	const exportOptions = [
		{
			title: "SQLite Database",
			description: "Complete portable database with all your data",
			route: "/export/sqlite",
		},
	];

	return (
		<Layout>
			<div class="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
				<div class="mb-8">
					<p class="mb-3 text-xs font-bold uppercase leading-4 tracking-[0.16em] text-purple-soft">
						Local export
					</p>
					<h1 class="mb-3 font-sans text-3xl font-semibold tracking-tight text-gray-100">Export your data</h1>
					<p class="text-base text-gray-400">
						Choose from various export formats to download and backup your Instagram data.
					</p>
				</div>

				<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
					{exportOptions.map((option) => (
						<Panel class="p-5 sm:p-6">
							<div class="mb-4">
								<h3 class="font-sans text-lg font-semibold tracking-tight text-gray-100">
									{option.title}
								</h3>
								<p class="text-sm text-gray-400">{option.description}</p>
							</div>
							<NavigationLink href={option.route} variant="primary" class="w-full">
								Export {option.title}
							</NavigationLink>
						</Panel>
					))}
				</div>

				<div class="flex justify-center">
					<NavigationLink href="/analysis">
						<span aria-hidden="true">←</span> Back to Analysis
					</NavigationLink>
				</div>
			</div>
		</Layout>
	);
};

export default Export;
