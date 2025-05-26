import { createSignal, Show, type Component, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { extractZipToFiles } from "../utils";
import { importData, ImportStep } from "../import/import";
import ImportProgress from "../components/ImportProgress";
import logo from "../assets/logo.svg";

const Home: Component = () => {
	const navigate = useNavigate();

	const [isImporting, setIsImporting] = createSignal(false);
	const [importSteps, setImportSteps] = createSignal<ImportStep[]>([]);

	const updateSteps = (name: string, progress: number, statusText?: string) => {
		setImportSteps((steps) => {
			const existingIndex = steps.findIndex((step) => step.name === name);
			if (existingIndex !== -1) {
				const updatedSteps = [...steps];
				updatedSteps[existingIndex] = {
					...updatedSteps[existingIndex],
					progress,
					statusText: statusText || updatedSteps[existingIndex].statusText,
				};
				return updatedSteps;
			} else {
				return [...steps, { name, progress, statusText }];
			}
		});
	};

	onMount(() => {
		const loaded = localStorage.getItem("loaded");
		if (loaded === "true") {
			navigate("/analysis", { replace: true });
		}
	});

	const handleFiles = async (files: FileList) => {
		let fileArray = Array.from(files);

		setIsImporting(true);

		try {
			if (fileArray.length === 1 && fileArray[0].name.endsWith(".zip")) {
				fileArray = await extractZipToFiles(fileArray[0], updateSteps);
			}

			await importData(fileArray, updateSteps);

			localStorage.setItem("loaded", "true");
			navigate("/analysis", { replace: true });
		} catch (error) {
			console.error("Import failed:", error);
		}
	};

	return (
		<div class="min-h-screen bg-gray-900">
			<div class="container mx-auto p-4">
				<div class="max-w-3xl mx-auto">
					<div class="flex flex-col items-center mb-8">
						<img src={logo} alt="Instagram Data Explorer Logo" class="w-24 h-24 mb-4" />
						<h1 class="text-4xl font-bold text-center mb-2 text-white">Instagram Data Explorer</h1>
						<p class="text-gray-300 text-center">
							Upload your Instagram data package to analyze your account activity
						</p>
					</div>

					<Show when={isImporting()}>
						<div class="mb-6 p-6 bg-gray-800 rounded-lg border border-gray-700">
							<ImportProgress steps={importSteps()} />
						</div>
					</Show>

					<Show when={!isImporting()}>
						<div class="border-2 border-gray-600 bg-gray-800 p-12 text-center rounded-lg">
							<input
								type="file"
								/* @ts-expect-error */
								webkitdirectory
								directory
								multiple
								id="folderPicker"
								class="hidden"
								disabled={isImporting()}
								onChange={(e) => handleFiles(e.currentTarget.files!)}
							/>
							<input
								type="file"
								accept=".zip"
								id="zipPicker"
								class="hidden"
								disabled={isImporting()}
								onChange={(e) => handleFiles(e.currentTarget.files!)}
							/>

							<div class="text-6xl mb-4">📁</div>
							<div class="text-xl font-medium mb-4 text-white">Upload your Instagram data here</div>
							<div class="text-gray-300 mb-6">
								Upload your data folder or the zip file you downloaded from Instagram
							</div>

							<div class="space-x-4">
								<label
									for="folderPicker"
									class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
								>
									Select Folder
								</label>
								<label
									for="zipPicker"
									class="inline-block bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
								>
									Select Zip File
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
