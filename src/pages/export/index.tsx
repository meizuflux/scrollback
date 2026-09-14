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
					<p class="mb-3 bg-gradient-to-r from-pink to-purple bg-clip-text text-xs font-bold uppercase tracking-[0.16em] leading-4 text-transparent">
						Local export
					</p>
					<h1 class="mb-3 font-sans text-3xl font-semibold tracking-tight text-white">Export your data</h1>
					<p class="text-base text-gray-400">
						Choose from various export formats to download and backup your Instagram data.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					{exportOptions.map((option) => (
						<div class="rounded-lg border border-gray-600/40 bg-gray-900/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:p-6">
							<div class="flex items-center mb-4">
								<div>
									<h3 class="font-sans text-lg font-semibold text-white">{option.title}</h3>
									<p class="text-sm text-gray-400">{option.description}</p>
								</div>
							</div>

							<button
								type="button"
								class="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-pink bg-pink px-4 py-2.5 text-sm font-semibold leading-5 text-gray-950 shadow-[0_8px_24px_rgba(255,110,196,0.14)] transition-colors hover:border-[#ffb1df] hover:bg-[#ffb1df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
								onClick={() => navigate(option.route)}
							>
								Export {option.title}
							</button>
						</div>
					))}
				</div>

				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<button
						type="button"
						class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:border-purple hover:bg-purple/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
						onClick={() => navigate("/analysis")}
					>
						← Back to Analysis
					</button>
				</div>
			</div>
		</Layout>
	);
};

export default Export;
