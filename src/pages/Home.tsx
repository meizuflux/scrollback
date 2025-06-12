import { createSignal, Show, type Component, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { extractZipToFiles, opfsSupported, requireDataLoaded, clearData } from "../utils";
import { importData, ImportStep } from "../import/import";
import ImportProgress from "../components/ImportProgress";
import logo from "../assets/logo.svg";
import Layout from "../components/Layout";

const Home: Component = () => {
	const navigate = useNavigate();

	const [isImporting, setIsImporting] = createSignal(false);
	const [importSteps, setImportSteps] = createSignal<ImportStep[]>([]);
	const [isClearing, setIsClearing] = createSignal(false);
	const [dataLoaded, setDataLoaded] = createSignal(false);
	const [importAborted, setImportAborted] = createSignal(false);
	const [showAbortMessage, setShowAbortMessage] = createSignal(false);

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
		const loaded = requireDataLoaded();
		setDataLoaded(loaded);
	});

	const handleFiles = async (files: FileList) => {
		let fileArray = Array.from(files);

		setIsImporting(true);
		setImportAborted(false);
		setImportSteps([]);

		try {
			let zipDuration = undefined;
			if (fileArray.length === 1 && fileArray[0].name.endsWith(".zip")) {
				const zipStartTime = performance.now();
				fileArray = await extractZipToFiles(fileArray[0], updateSteps);
				zipDuration = performance.now() - zipStartTime;
			}

			if (importAborted()) {
				throw new Error("Import was stopped by user");
			}

			await importData(fileArray, updateSteps, zipDuration);

			if (!importAborted()) {
				localStorage.setItem("loaded", "true");
				navigate("/analysis", { replace: true });
			}
		} catch (error) {
			console.error("Import failed:", error);
			setIsImporting(false);
		}
	};

	const handleStopImport = () => {
		setImportAborted(true);
		setIsImporting(false);
		setImportSteps([]);
		setShowAbortMessage(true);
		setTimeout(() => setShowAbortMessage(false), 5000);
	};

	return (
	    <Layout>
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
							<ImportProgress steps={importSteps()} onStop={handleStopImport} />
						</div>
					</Show>

					<Show when={showAbortMessage()}>
						<div class="mb-6 p-4 bg-yellow-800 rounded-lg border border-yellow-700">
							<div class="text-center">
								<div class="text-2xl mb-2">⚠️</div>
								<h3 class="text-lg font-bold text-white mb-1">Import Stopped</h3>
								<p class="text-yellow-300">The import process was cancelled. You can try again with your data files.</p>
							</div>
						</div>
					</Show>

					<Show when={dataLoaded() && !isImporting()}>
						<div class="mb-6 p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-blue-500/20 shadow-xl">
							<div class="text-center">
								<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
									<div class="text-2xl">✨</div>
								</div>
								<h2 class="text-2xl font-bold mb-3 text-white">Data Ready!</h2>
								<p class="text-gray-300 mb-6 text-lg max-w-md mx-auto">
									Your Instagram data has been successfully imported and is ready for analysis.
								</p>
								<div class="flex flex-col sm:flex-row gap-3 justify-center">
									<button
										class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
										onClick={() => navigate("/analysis")}
									>
										📊 View Analysis
									</button>
									<button
										class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 border border-gray-600"
										onClick={async () => {
											setIsClearing(true);
											await clearData();
											setDataLoaded(false);
											setIsClearing(false);
										}}
										disabled={isClearing()}
									>
										{isClearing() ? (
											<div class="flex items-center justify-center">
												<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
												Clearing...
											</div>
										) : (
											"🗑️ Clear Data"
										)}
									</button>
								</div>
							</div>
						</div>
					</Show>

					<Show when={!dataLoaded() && !isImporting()}>
						<div class="border-2 border-dashed border-gray-500 bg-gradient-to-br from-gray-800 to-gray-900 p-12 text-center rounded-xl hover:border-blue-400 transition-all duration-300 shadow-lg">
							<input
								type="file"
								/* @ts-expect-error */
								webkitdirectory
								directory
								multiple
								id="folderPicker"
								class="hidden"
								disabled={isImporting() || opfsSupported() == undefined}
								onChange={(e) => handleFiles(e.currentTarget.files!)}
							/>
							<input
								type="file"
								accept=".zip"
								id="zipPicker"
								class="hidden"
								disabled={isImporting() || opfsSupported() == undefined}
								onChange={(e) => handleFiles(e.currentTarget.files!)}
							/>

							<div class="text-7xl mb-6 animate-pulse">📁</div>
							<div class="text-2xl font-bold mb-4 text-white">Upload your Instagram data</div>
							<div class="text-gray-300 mb-8 text-lg max-w-md mx-auto">
								Upload your data folder or the zip file you downloaded from Instagram to get started
							</div>
							<div class="flex flex-col sm:flex-row gap-4 justify-center">
								<label
									for="folderPicker"
									class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
								>
									📂 Select Folder
								</label>
								<label
									for="zipPicker"
									class="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-lg cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
								>
									📦 Select Zip File
								</label>
							</div>
						</div>
					</Show>
				</div>
			</div>
		</Layout>
	);
};

export default Home;
