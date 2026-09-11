import { useNavigate } from "@solidjs/router";
import { type Component, onMount } from "solid-js";
import { isDataLoaded } from "@/utils/storage";
import Layout from "@/components/Layout";

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
			<div class="container mx-auto max-w-5xl px-4 py-7 sm:px-6">
				<div class="mb-8">
					<p class="app-kicker mb-3">Local export</p>
					<h1 class="mb-3 text-3xl font-semibold tracking-tight text-[#F2F2F2]">Export your data</h1>
					<p class="text-base text-[#A3A3A3]">
						Choose from various export formats to download and backup your Instagram data.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					{exportOptions.map((option) => (
						<div class="app-panel p-5 sm:p-6">
							<div class="flex items-center mb-4">
								<div>
									<h3 class="text-lg font-semibold text-[#F2F2F2]">{option.title}</h3>
									<p class="text-sm text-[#A3A3A3]">{option.description}</p>
								</div>
							</div>

							<button
								type="button"
								class="app-button-primary w-full"
								onClick={() => navigate(option.route)}
							>
								Export {option.title}
							</button>
						</div>
					))}
				</div>

				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<button type="button" class="app-button-secondary" onClick={() => navigate("/analysis")}>
						← Back to Analysis
					</button>
				</div>
			</div>
		</Layout>
	);
};

export default Export;
