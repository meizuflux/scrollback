import { createSignal, Show, type Component, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { isDataLoaded } from "@/utils/storage";
import { Unzip, AsyncUnzipInflate } from "fflate";
import { importData, type ImportStep } from "@/import/import";
import ImportProgress from "@/components/ImportProgress";
import { getFileType } from "@/utils/media";
import { opfsSupported, clearData } from "@/utils/storage";
import logo from "@/assets/logo.svg";
import Layout from "@/components/Layout";

const extractZipToFiles = async (
	zipFile: File,
	updateSteps: (name: string, progress: number, statusText?: string) => void,
): Promise<File[]> => {
	updateSteps("Unzipping files", 0, "Reading ZIP file...");

	return new Promise<File[]>((resolve, reject) => {
		const extractedFiles: File[] = [];

		let totalFiles = 0;
		let filesProcessed = 0;
		let discoveryComplete = false;

		const checkCompletion = () => {
			if (discoveryComplete && filesProcessed === totalFiles) {
				updateSteps("Unzipping files", 100, "All files extracted successfully.");
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
						value: filePath.startsWith("/") ? filePath : `/${filePath}`,
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

		const reader = zipFile.stream().getReader();
		const processStream = async () => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						mainUnzipper.push(new Uint8Array(0), true);
						discoveryComplete = true;
						checkCompletion();
						break;
					}
					mainUnzipper.push(value);
				}
			} catch (err) {
				reject(err);
			}
		};
		processStream();
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
		const loaded = isDataLoaded();
		setDataLoaded(loaded);
	});

	const handleFiles = async (files: FileList) => {
		clearData();

		let fileArray = Array.from(files);

		setIsImporting(true);
		setImportAborted(false);
		setImportSteps([]);

		try {
			let zipDuration;
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
			<div class="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
				{/* Header */}
				<div class="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
					<img src={logo} alt="Scrollback Logo" class="mx-auto mb-5 h-12 w-12" />
					<h1 class="mb-3 text-3xl font-semibold tracking-tight text-[#F2F2F2]">Scrollback</h1>
					<p class="text-base text-[#A3A3A3] sm:text-lg">Explore your Instagram archive.</p>
				</div>

				{/* Import Progress */}
				<Show when={isImporting()}>
					<div class="app-panel mb-8 p-5 sm:p-6">
						<ImportProgress steps={importSteps()} onStop={handleStopImport} />
					</div>
				</Show>

				{/* Abort Message */}
				<Show when={showAbortMessage()}>
					<div class="app-warning mb-8 p-4">
						<div class="flex items-start gap-3">
							<svg
								class="mt-0.5 h-5 w-5 shrink-0 text-[#E4B957]"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.75"
									d="M12 9v4m0 4h.01M10.3 4.8 2.9 18a2 2 0 0 0 1.75 3h14.7a2 2 0 0 0 1.75-3L13.7 4.8a2 2 0 0 0-3.4 0Z"
								/>
							</svg>
							<div>
								<h3 class="mb-1 text-base font-semibold text-[#E4B957]">Import Stopped</h3>
								<p class="text-sm text-[#CFC3A5]">
									The import process was cancelled. You can try again with your data files.
								</p>
							</div>
						</div>
					</div>
				</Show>

				{/* Data Ready State */}
				<Show when={dataLoaded() && !isImporting()}>
					<div class="app-panel mb-8 p-6 sm:p-8">
						<div class="text-center">
							<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#4A99F8] text-[#4A99F8]">
								<svg
									class="h-5 w-5"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="m5 12 4 4L19 6"
									/>
								</svg>
							</div>
							<h2 class="mb-3 text-2xl font-semibold text-[#F2F2F2]">Data Ready</h2>
							<p class="mx-auto mb-6 max-w-md text-[#A3A3A3]">
								Your Instagram data has been successfully imported and is ready for analysis.
							</p>
							<div class="flex flex-col justify-center gap-3 sm:flex-row">
								<button type="button" class="app-button-primary" onClick={() => navigate("/analysis")}>
									View Analysis
								</button>
								<button
									type="button"
									class="app-button-secondary"
									onClick={async () => {
										setIsClearing(true);
										await clearData();
										setDataLoaded(false);
										setIsClearing(false);
									}}
									disabled={isClearing()}
								>
									{isClearing() ? (
										<div class="flex items-center justify-center gap-2">
											<div class="h-4 w-4 animate-spin rounded-full border-2 border-[#737373] border-t-[#F2F2F2]"></div>
											Clearing...
										</div>
									) : (
										"Clear Data"
									)}
								</button>
							</div>
						</div>
					</div>
				</Show>

				{/* Upload Section */}
				<Show when={!dataLoaded() && !isImporting()}>
					{/* Upload Area */}
					<div class="app-panel mb-8 p-7 text-center sm:p-10">
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

						<div class="mx-auto mb-5 flex h-8 w-8 items-center justify-center text-[#A3A3A3]">
							<svg
								class="h-8 w-8"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M3.75 6.75A1.75 1.75 0 0 1 5.5 5h4l1.5 2h7.5a1.75 1.75 0 0 1 1.75 1.75v8.5A1.75 1.75 0 0 1 18.5 19h-13a1.75 1.75 0 0 1-1.75-1.75v-10.5Z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 10v5m0 0 2-2m-2 2-2-2"
								/>
							</svg>
						</div>
						<h3 class="mb-3 text-xl font-semibold text-[#F2F2F2]">Import your Instagram archive</h3>
						<p class="mx-auto mb-7 max-w-md text-sm text-[#A3A3A3] sm:text-base">
							Upload the zip file or extracted folder from your Instagram data download
						</p>

						<div class="mx-auto flex max-w-md flex-col justify-center gap-3 sm:flex-row">
							<button
								type="button"
								class="app-button-primary app-file-button"
								onClick={() => document.getElementById("zipPicker")?.click()}
							>
								Select ZIP file
							</button>
							<button
								type="button"
								class="app-button-secondary app-file-button"
								onClick={() => document.getElementById("folderPicker")?.click()}
							>
								Select folder
							</button>
						</div>
						<p class="mt-5 text-sm text-[#A3A3A3]">
							Your data stays on this device. Processing happens locally in your browser.
						</p>
					</div>

					{/* How to Get Instagram Data */}
					<div class="app-panel mb-8 p-5 sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-[#F2F2F2]">
							<svg
								class="h-5 w-5 text-[#A3A3A3]"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M7 3.75h8.5L19 7.25v13H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M15 3.75v4h4M9 12h6m-6 3h6"
								/>
							</svg>
							How to Download Your Instagram Data
						</h2>
						<div class="space-y-3 text-sm text-[#A3A3A3]">
							<div class="flex items-start gap-3">
								<span class="font-semibold text-[#F2F2F2]">1.</span>
								<div>
									Go to{" "}
									<a
										href="https://accountscenter.instagram.com/info_and_permissions/"
										target="_blank"
										rel="noopener noreferrer"
										class="app-link"
									>
										Instagram Account Center
									</a>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-[#F2F2F2]">2.</span>
								<span>Click "Download your information"</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-[#F2F2F2]">3.</span>
								<span>Select "All available information" or choose specific data types</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-[#F2F2F2]">4.</span>
								<span>Choose your preferred date range</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-[#F2F2F2]">5.</span>
								<span>Select "Low" media quality for better performance</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-[#F2F2F2]">6.</span>
								<span class="font-semibold text-[#F2F2F2]">
									IMPORTANT: Make sure the format is set to JSON (not HTML)
								</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-[#F2F2F2]">7.</span>
								<span>
									Check your email for a notification that your data package is ready for download
								</span>
							</div>
						</div>
					</div>

					{/* Limitations */}
					<div class="app-panel mb-8 p-5 sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-[#F2F2F2]">
							<svg
								class="h-5 w-5 text-[#A3A3A3]"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 9v4m0 4h.01M10.3 4.8 2.9 18a2 2 0 0 0 1.75 3h14.7a2 2 0 0 0 1.75-3L13.7 4.8a2 2 0 0 0-3.4 0Z"
								/>
							</svg>
							Known Limitations
						</h2>
						<ul class="space-y-2 text-sm text-[#A3A3A3]">
							<li class="flex items-start gap-2">
								<span class="text-[#737373]">•</span>
								<span>
									Instagram frequently changes their data format - we try to stay updated but some
									files may not parse correctly
								</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-[#737373]">•</span>
								<span>Processing large datasets can be slow and memory-intensive</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-[#737373]">•</span>
								<span>Instagram's data export can be incomplete or contain inconsistencies</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-[#737373]">•</span>
								<span>Some features may not work on older browsers or mobile devices</span>
							</li>
						</ul>
					</div>
				</Show>
			</div>
		</Layout>
	);
};

export default Home;
