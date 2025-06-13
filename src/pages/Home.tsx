import { createSignal, Show, type Component, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { opfsSupported, requireDataLoaded, clearData } from "@/utils";
import { Unzip, AsyncUnzipInflate } from "fflate";
import { importData, ImportStep } from "@/import/import";
import ImportProgress from "@/components/ImportProgress";
import { getFileType } from "@/utils";
import logo from "@/assets/logo.svg";
import Layout from "@/components/Layout";

const extractZipToFiles = async (
    zipFile: File,
    updateSteps: (name: string, progress: number, statusText?: string) => void,
): Promise<File[]> => {
    updateSteps("Unzipping files", 0, "Reading ZIP file...");
    const arrayBuffer = await zipFile.arrayBuffer();
    const zipData = new Uint8Array(arrayBuffer);

    return new Promise<File[]>((resolve, _) => {
        const extractedFiles: File[] = [];

        let totalFiles = 0;
        let filesProcessed = 0;
        let discoveryComplete = false;

        const checkCompletion = () => {
            if (discoveryComplete && filesProcessed === totalFiles) {
                updateSteps(
                    "Unzipping files",
                    100,
                    "All files extracted successfully.",
                );
                resolve(extractedFiles);
            }
        };

        const mainUnzipper = new Unzip((stream) => {
            // stream is FFlateUnzipFile
            const filePath = stream.name;

            if (filePath.endsWith("/")) {
                // Skip directories
                return;
            }

            const chunks: Uint8Array[] = [];
            let totalSize = 0;

            totalFiles++; // Increment total files count for each stream created
            stream.ondata = (err, chunk, final) => {
                /*if (err) {
                    console.error(`[extractZipToFiles] Error DURING DECOMPRESSION of file "${filePath}":`, err);
                    // Stop further file discoveries by this Unzip instance, as state might be corrupt.
                    mainUnzipper.onfile = () => {};
                    // Reject the entire operation on the first file processing error.
                    reject(new Error(`Error decompressing file "${filePath}": ${err.message || String(err)}`));
                    return;
                } */

                if (chunk) {
                    chunks.push(chunk);
                    totalSize += chunk.length;
                }

                if (final) {
                    const completeFileBuffer = new Uint8Array(totalSize);
                    let offset = 0;
                    for (const bufferChunk of chunks) {
                        completeFileBuffer.set(bufferChunk, offset);
                        offset += bufferChunk.length;
                    }

                    const newFile = new File([completeFileBuffer], filePath, {
                        type: getFileType(filePath),
                    });
                    Object.defineProperty(newFile, "webkitRelativePath", {
                        value: filePath.startsWith("/")
                            ? filePath
                            : `/${filePath}`,
                        writable: false,
                    }); // this was miserable to rememebr to find
                    extractedFiles.push(newFile);
                    filesProcessed++;

                    checkCompletion();
                }
            };

            stream.start();
        });

        mainUnzipper.register(AsyncUnzipInflate);

        mainUnzipper.push(zipData, true);
        discoveryComplete = true;

        checkCompletion(); // for when no files in zip
    });
};

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
			<div class="container mx-auto p-6 max-w-4xl">
				{/* Header */}
				<div class="text-center mb-12">
					<img src={logo} alt="Scrollback Logo" class="w-20 h-20 mx-auto mb-6" />
					<h1 class="text-4xl font-bold text-white mb-4">Scrollback</h1>
					<p class="text-xl text-gray-300 max-w-2xl mx-auto">
					    Upload your Instagram data package to analyze your account activity
					</p>
				</div>

				{/* Import Progress */}
				<Show when={isImporting()}>
					<div class="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
						<ImportProgress steps={importSteps()} onStop={handleStopImport} />
					</div>
				</Show>

				{/* Abort Message */}
				<Show when={showAbortMessage()}>
					<div class="mb-8 p-4 bg-yellow-900/30 rounded-lg border border-yellow-700/50">
						<div class="flex items-center space-x-3">
							<div class="text-yellow-400 text-xl">⚠️</div>
							<div>
								<h3 class="text-lg font-semibold text-yellow-400 mb-1">Import Stopped</h3>
								<p class="text-yellow-200 text-sm">The import process was cancelled. You can try again with your data files.</p>
							</div>
						</div>
					</div>
				</Show>

				{/* Data Ready State */}
				<Show when={dataLoaded() && !isImporting()}>
					<div class="mb-8 p-8 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
						<div class="text-center">
							<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
								<div class="text-2xl">✨</div>
							</div>
							<h2 class="text-2xl font-bold text-white mb-3">Data Ready!</h2>
							<p class="text-gray-300 mb-6 max-w-md mx-auto">
								Your Instagram data has been successfully imported and is ready for analysis.
							</p>
							<div class="flex flex-col sm:flex-row gap-3 justify-center">
								<button
									class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
									onClick={() => navigate("/analysis")}
								>
									📊 View Analysis
								</button>
								<button
									class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-gray-600"
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

				{/* Upload Section */}
				<Show when={!dataLoaded() && !isImporting()}>
					{/* Upload Area */}
					<div class="mb-8 border-2 border-dashed border-gray-600 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-12 text-center rounded-lg hover:border-gray-500 transition-all duration-300">
						<input
							type="file"
							accept=".zip"
							id="zipPicker"
							class="hidden"
							disabled={isImporting() || opfsSupported() == undefined}
							onChange={(e) => handleFiles(e.currentTarget.files!)}
						/>
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

						<div class="text-6xl mb-6 text-gray-500">📁</div>
						<h3 class="text-2xl font-bold text-white mb-4">Upload Your Instagram Data</h3>
						<p class="text-gray-400 mb-8 max-w-md mx-auto">
							Upload the zip file or extracted folder from your Instagram data download
						</p>

						<div class="flex flex-col sm:flex-row gap-4 justify-center">
							<label
								for="zipPicker"
								class="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
							>
								<span class="mr-2">📦</span>
								Select Zip File
							</label>
							<label
								for="folderPicker"
								class="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
							>
								<span class="mr-2">📂</span>
								Select Folder
							</label>
						</div>
					</div>

					{/* How to Get Instagram Data */}
					<div class="mb-8 p-6 bg-blue-900/20 rounded-lg border border-blue-700/30">
						<h2 class="text-xl font-semibold text-blue-400 mb-4 flex items-center">
							<span class="mr-2">📋</span>
							How to Download Your Instagram Data
						</h2>
						<div class="space-y-3 text-gray-300 text-sm">
							<div class="flex items-start space-x-3">
								<span class="text-blue-400 font-semibold">1.</span>
								<div>
									Go to{" "}
									<a href="https://accountscenter.instagram.com/info_and_permissions/"
									   target="_blank" rel="noopener noreferrer"
									   class="text-blue-400 hover:text-blue-300 underline">
										Instagram Account Center
									</a>
								</div>
							</div>
							<div class="flex items-start space-x-3">
								<span class="text-blue-400 font-semibold">2.</span>
								<span>Click "Download your information"</span>
							</div>
							<div class="flex items-start space-x-3">
								<span class="text-blue-400 font-semibold">3.</span>
								<span>Select "All available information" or choose specific data types</span>
							</div>
							<div class="flex items-start space-x-3">
								<span class="text-blue-400 font-semibold">4.</span>
								<span>Choose your preferred date range</span>
							</div>
							<div class="flex items-start space-x-3">
								<span class="text-blue-400 font-semibold">5.</span>
								<span>Select "Low" media quality for better performance</span>
							</div>
							<div class="flex items-start space-x-3">
								<span class="text-blue-400 font-semibold">6.</span>
								<span class="font-semibold text-blue-300">
									IMPORTANT: Make sure the format is set to JSON (not HTML)
								</span>
							</div>
							<div class="flex items-start space-x-3">
								<span class="text-blue-400 font-semibold">6.</span>
								<span>Check your email for a notification that your data package is ready for download</span>
							</div>
						</div>
					</div>

					{/* Limitations */}
					<div class="mb-8 p-6 bg-orange-900/20 rounded-lg border border-orange-700/30">
						<h2 class="text-xl font-semibold text-orange-400 mb-4 flex items-center">
							<span class="mr-2">⚠️</span>
							Known Limitations
						</h2>
						<ul class="space-y-2 text-gray-300 text-sm">
							<li class="flex items-start space-x-2">
								<span class="text-orange-400">•</span>
								<span>Instagram frequently changes their data format - we try to stay updated but some files may not parse correctly</span>
							</li>
							<li class="flex items-start space-x-2">
								<span class="text-orange-400">•</span>
								<span>Processing large datasets can be slow and memory-intensive</span>
							</li>
							<li class="flex items-start space-x-2">
								<span class="text-orange-400">•</span>
								<span>Instagram's data export can be incomplete or contain inconsistencies</span>
							</li>
							<li class="flex items-start space-x-2">
								<span class="text-orange-400">•</span>
								<span>Some features may not work on older browsers or mobile devices</span>
							</li>
						</ul>
					</div>

					{/* Privacy & Open Source Notice */}
					<div class="mb-8 p-6 bg-green-900/20 rounded-lg border border-green-700/30">
						<div class="flex items-start space-x-3">
							<div class="text-green-400 text-xl">🔒</div>
							<div>
								<h3 class="text-lg font-semibold text-green-400 mb-2">Privacy First</h3>
								<p class="text-gray-300 text-sm leading-relaxed">
									Your data never leaves your device. All processing happens locally in your browser.
								</p>
							</div>
						</div>
					</div>
				</Show>
			</div>
		</Layout>
	);
};

export default Home;
