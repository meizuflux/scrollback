import { useNavigate } from "@solidjs/router";
import { Component, onMount } from "solid-js";
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
			route: "/export/sqlite"
		}
	];

	return (
		<Layout>
			<div class="container mx-auto p-4">
				<div class="mb-8">
					<h1 class="text-4xl font-bold mb-4 text-white">Export Your Data</h1>
					<p class="text-gray-300 text-lg">
						Choose from various export formats to download and backup your Instagram data.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					{exportOptions.map((option) => (
						<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
							<div class="flex items-center mb-4">
								<div>
									<h3 class="text-xl font-semibold text-white">{option.title}</h3>
									<p class="text-gray-400 text-sm">{option.description}</p>
								</div>
							</div>

							<button
								class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
								onClick={() => navigate(option.route)}
							>
								Export {option.title}
							</button>
						</div>
					))}
				</div>

				<div class="flex flex-col sm:flex-row gap-4 justify-center">
					<button
						class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded transition-colors"
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
