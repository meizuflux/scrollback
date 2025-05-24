import { Component, createResource, createSignal, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { db } from "../db/database";

import MessageAnalysis from "../components/Messages";
import UsersAnalysis from "../components/Users";
import { StoredData } from "../types/data";

const loadData = async (): Promise<StoredData> => {
	// Use Promise.all for parallel data loading
	const [user, users, conversations, messages] = await Promise.all([
		Promise.resolve(JSON.parse(localStorage.getItem("user")!)),
		db.users.toArray(),
		db.conversations.toArray(),
		db.messages.toArray()
	]);

	return {
		user,
		users,
		conversations,
		messages,
	};
};

const Analysis: Component = (props) => {
	const navigate = useNavigate();
	const [data] = createResource(loadData);

	onMount(() => {
		// Check if data is loaded, if not redirect to home
		const loaded = localStorage.getItem("loaded");
		if (loaded !== "true") {
			navigate("/", { replace: true });
		}
	});

	const clearData = async () => {
		localStorage.clear();
		await db.delete();
		navigate("/", { replace: true });
	};

	return (
		<div class="min-h-screen bg-gray-900">
			<div class="container mx-auto p-4">
				<div class="flex justify-between items-center mb-6">
					<div>
						<h1 class="text-4xl font-bold mb-2 text-white">Instagram Data Analysis</h1>
						<Show when={data() && !data.loading}>
							<p class="text-gray-300">
								Analysis for @{data()?.user?.username}
							</p>
						</Show>
					</div>
					<div class="flex gap-2">
						<button 
							class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
							onClick={() => navigate("/export")}
						>
							Export
						</button>
						<button 
							class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors" 
							onClick={clearData}
						>
							Clear Data
						</button>
					</div>
				</div>
				
				<Show when={!data.loading} fallback={
					<div class="flex justify-center items-center py-20">
						<div class="text-center">
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
							<p class="text-gray-300">Loading your data...</p>
						</div>
					</div>
				}>
					<MessageAnalysis data={data()!} />
					<UsersAnalysis data={data()!} />
				</Show>
			</div>
		</div>
	);
};

export default Analysis;
