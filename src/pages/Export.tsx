import { useNavigate } from "@solidjs/router";
import { Component, onMount } from "solid-js";
import { requireDataLoaded } from "../utils";
import Layout from "../components/Layout";

const Export: Component = () => {
	const navigate = useNavigate();

	onMount(() => {
		if (!requireDataLoaded()) {
			navigate("/", { replace: true });
		}
	});

	return (
		<Layout>
			<div class="container mx-auto p-4">
				<h1 class="text-4xl font-bold mb-6 text-white">Export Data</h1>
				<p class="text-gray-300 mb-4">This feature is not yet implemented. Stay tuned for updates!</p>
				<button
					class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
					onClick={() => navigate("/analysis")}
				>
					← Back to Analysis
				</button>
			</div>
		</Layout>
	);
};

export default Export;
