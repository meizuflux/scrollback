import { createSignal, Show, type Component, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { extractZipToFiles } from "../utils";
import { importData } from "../import/import";

const Home: Component = () => {
	const navigate = useNavigate();
	const [isImporting, setIsImporting] = createSignal(false);

	onMount(() => {
		// Check if data is already loaded and redirect to analysis
		const loaded = localStorage.getItem("loaded");
		if (loaded === "true") {
			navigate("/analysis", { replace: true });
		}
	});

	const handleFiles = async (files: FileList) => {
		let fileArray = Array.from(files);
		
		setIsImporting(true);
		
		try {
			if (fileArray.length === 1 && fileArray[0].name.endsWith('.zip')) {
				fileArray = await extractZipToFiles(fileArray[0]);
			}
						
			await importData(fileArray);

			localStorage.setItem("loaded", "true");
			
			navigate("/analysis", { replace: true });
		} catch (error) {
			console.error("Import failed:", error);
			setIsImporting(false);
		}
	};

	return (
		<div class="min-h-screen bg-gray-900">
			<div class="container mx-auto p-4">
				<div class="max-w-2xl mx-auto">
					<h1 class="text-4xl font-bold text-center mb-2 text-white">Instagram Data Explorer</h1>
					<p class="text-gray-300 text-center mb-8">
						Upload your Instagram data package to analyze your account activity
					</p>
					
					<Show when={isImporting()}>
						<div class="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
							<h1 class="text-2xl font-semibold text-white mb-2">Importing Data...</h1>
						</div>
					</Show>
					
					<Show when={!isImporting()}>
						<div class="space-y-4">
							{/* Folder Upload */}
							<div class="upload-zone border-2 border-dashed border-gray-600 bg-gray-800 p-8 text-center rounded-lg hover:border-blue-500 hover:bg-gray-750 transition-colors">
								<input
									type="file"
									/* @ts-expect-error */ // webkitdirectory isn't supported in JSX :shrug:
									webkitdirectory
									directory
									multiple
									id="folderPicker"
									class="hidden"
									disabled={isImporting()}
									onChange={(e) => handleFiles(e.currentTarget.files!)}
								/>
								<label for="folderPicker" class={`cursor-pointer block ${isImporting() ? 'opacity-50 cursor-not-allowed' : ''}`}>
									<div class="text-lg font-medium mb-2 text-white">📁 Upload Folder</div>
									<div class="text-sm text-gray-300">
										{isImporting() ? 'Importing...' : 'Click to select your Instagram data folder'}
									</div>
								</label>
							</div>

							<div class="text-center text-gray-400 font-medium">OR</div>

							{/* Zip File Upload */}
							<div class="upload-zone border-2 border-dashed border-gray-600 bg-gray-800 p-8 text-center rounded-lg hover:border-blue-500 hover:bg-gray-750 transition-colors">
								<input
									type="file"
									accept=".zip"
									id="zipPicker"
									class="hidden"
									disabled={isImporting()}
									onChange={(e) => handleFiles(e.currentTarget.files!)}
								/>
								<label for="zipPicker" class={`cursor-pointer block ${isImporting() ? 'opacity-50 cursor-not-allowed' : ''}`}>
									<div class="text-lg font-medium mb-2 text-white">📦 Upload Zip File</div>
									<div class="text-sm text-gray-300">
										{isImporting() ? 'Importing...' : 'Click to select your Instagram data zip file'}
									</div>
								</label>
							</div>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
};

export default Home;
