import { createSignal, Show, type Component, onCleanup, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { clearData, isDataLoaded, markDataLoaded, opfsSupported } from "@/utils/storage";
import { importData, ImportCancelledError, type ImportStep } from "@/import/import";
import { extractZipToFiles } from "@/import/extractZip";
import DataReadyState from "@/components/home/DataReadyState";
import ImportPicker from "@/components/home/ImportPicker";
import ImportStatus from "@/components/home/ImportStatus";
import logo from "@/assets/logo.svg";
import Layout from "@/components/Layout";
import { enterDemoMode, isDemoMode } from "@/utils/demo";
import { loadDemoFiles, prefetchDemoManifest } from "@/demo/loadDemoFiles";
import { loadAnalysisPage } from "@/pages/analysisLoader";

type PreparedImport = {
	files: File[];
	unzipDuration?: number;
};

type ImportRequest = {
	initialSteps?: ImportStep[];
	prepare: (signal: AbortSignal) => Promise<PreparedImport>;
	clearBeforePrepare?: boolean;
	onSuccess?: () => void;
	errorMessage: string;
};

const Home: Component = () => {
	const navigate = useNavigate();

	const [isImporting, setIsImporting] = createSignal(false);
	const [importSteps, setImportSteps] = createSignal<ImportStep[]>([]);
	const [isClearing, setIsClearing] = createSignal(false);
	const [dataLoaded, setDataLoaded] = createSignal(false);
	const [importAborted, setImportAborted] = createSignal(false);
	const [showAbortMessage, setShowAbortMessage] = createSignal(false);
	const [errorMessage, setErrorMessage] = createSignal("");
	const [demoManifestLoading, setDemoManifestLoading] = createSignal(true);
	let activeController: AbortController | undefined;

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

	const beginOperation = (steps: ImportStep[] = []) => {
		activeController = new AbortController();
		setIsImporting(true);
		setImportAborted(false);
		setErrorMessage("");
		setImportSteps(steps);
	};

	const completeOperation = () => {
		activeController = undefined;
		setIsImporting(false);
	};

	const showCancelled = () => {
		setShowAbortMessage(true);
		setTimeout(() => setShowAbortMessage(false), 5000);
	};

	const runImport = async ({
		initialSteps = [],
		prepare,
		clearBeforePrepare = false,
		onSuccess,
		errorMessage,
	}: ImportRequest) => {
		if (isImporting()) return;
		void loadAnalysisPage().catch(() => undefined);
		beginOperation(initialSteps);
		const controller = activeController!;
		let dataCleared = false;
		try {
			if (clearBeforePrepare) {
				await clearData();
				dataCleared = true;
				setDataLoaded(false);
			}
			const { files, unzipDuration } = await prepare(controller.signal);
			if (controller.signal.aborted) throw new ImportCancelledError();
			if (!dataCleared) {
				await clearData();
				dataCleared = true;
				setDataLoaded(false);
			}
			await importData(files, updateSteps, unzipDuration, controller.signal);
			if (controller.signal.aborted) throw new ImportCancelledError();
			markDataLoaded();
			onSuccess?.();
			setDataLoaded(true);
			navigate("/analysis", { replace: true });
		} catch (error) {
			console.error("Import failed:", error);
			if (dataCleared) {
				await clearData();
				setDataLoaded(isDataLoaded());
			}
			if (controller.signal.aborted || error instanceof ImportCancelledError) {
				showCancelled();
			} else {
				setErrorMessage(error instanceof Error ? error.message : errorMessage);
			}
		} finally {
			completeOperation();
		}
	};

	const handleFiles = (files: FileList) => {
		const fileArray = Array.from(files);
		runImport({
			clearBeforePrepare: true,
			prepare: async (signal) => {
				if (fileArray.length !== 1 || !fileArray[0].name.toLowerCase().endsWith(".zip")) {
					return { files: fileArray };
				}
				const zipStartTime = performance.now();
				const files = await extractZipToFiles(fileArray[0], updateSteps, signal);
				return { files, unzipDuration: performance.now() - zipStartTime };
			},
			errorMessage: "The import failed. Please try again.",
		});
	};

	const startDemoImport = () => {
		if (demoManifestLoading()) return;
		runImport({
			initialSteps: [{ name: "Loading demo data", progress: 0, statusText: "Preparing demo files..." }],
			prepare: async (signal) => {
				const files = await loadDemoFiles(
					({ completed, total }) =>
						updateSteps(
							"Loading demo data",
							Math.round((completed / total) * 100),
							`Downloaded ${completed} of ${total} files`,
						),
					signal,
				);
				updateSteps("Loading demo data", 100, "Demo files validated successfully.");
				return { files };
			},
			onSuccess: enterDemoMode,
			errorMessage: "The demo could not be loaded. Please try again.",
		});
	};

	const handleClearData = async () => {
		setIsClearing(true);
		try {
			await clearData();
			setDataLoaded(false);
		} finally {
			setIsClearing(false);
		}
	};

	const handleStopImport = () => {
		if (!isImporting() || importAborted()) return;
		setImportAborted(true);
		activeController?.abort();
	};

	onMount(() => {
		setDataLoaded(isDataLoaded());

		const warmDemoManifest = () => {
			void prefetchDemoManifest()
				.then(() => setDemoManifestLoading(false))
				.catch(() => {
					// A background warmup failure should not strand the action in a
					// loading state. The user-triggered load will retry and report any
					// error in the normal import status UI.
					setDemoManifestLoading(false);
				});
		};
		const idleWindow = window as Window & {
			requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
			cancelIdleCallback?: (handle: number) => void;
		};
		let idleHandle: number | undefined;
		let timeoutHandle: number | undefined;
		const scheduleWarmup = () => {
			if (idleWindow.requestIdleCallback) {
				idleHandle = idleWindow.requestIdleCallback(warmDemoManifest, { timeout: 2000 });
			} else {
				timeoutHandle = window.setTimeout(warmDemoManifest, 0);
			}
		};

		if (document.readyState === "complete") scheduleWarmup();
		else window.addEventListener("load", scheduleWarmup, { once: true });

		onCleanup(() => {
			window.removeEventListener("load", scheduleWarmup);
			if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
			if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
		});
	});

	onCleanup(() => {
		activeController?.abort();
	});

	return (
		<Layout>
			<div class="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
				{/* Header */}
				<div class="relative mx-auto mb-10 max-w-2xl text-center sm:mb-12">
					<div class="mx-auto mb-6 h-12 w-12">
						<img src={logo} alt="Scrollback Logo" class="h-12 w-12" />
					</div>
					<h1 class="mb-3 bg-gradient-to-r from-pink to-purple bg-clip-text font-sans text-3xl font-bold tracking-tight text-transparent">
						Scrollback
					</h1>
					<p class="text-base text-gray-400 sm:text-lg">Explore your Instagram archive.</p>
				</div>

				<ImportStatus
					isImporting={isImporting()}
					importAborted={importAborted()}
					steps={importSteps()}
					showAbortMessage={showAbortMessage()}
					errorMessage={errorMessage()}
					demoMode={isDemoMode()}
					onStop={importAborted() ? undefined : handleStopImport}
					onRetryDemo={startDemoImport}
					onDismissError={() => setErrorMessage("")}
				/>

				<Show when={dataLoaded() && !isImporting()}>
					<DataReadyState
						demoMode={isDemoMode()}
						isClearing={isClearing()}
						onViewAnalysis={() => navigate("/analysis")}
						onTryDemo={startDemoImport}
						onClearData={handleClearData}
					/>
				</Show>

				{/* Upload Section */}
				<Show when={!dataLoaded() && !isImporting()}>
					<ImportPicker
						filePickerDisabled={opfsSupported() == undefined}
						demoManifestReady={!demoManifestLoading()}
						onFiles={handleFiles}
						onTryDemo={startDemoImport}
					/>

					{/* How to Get Instagram Data */}
					<div class="mb-8 rounded-lg border border-gray-600/40 bg-gray-900/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 font-sans text-lg font-semibold text-white">
							<svg
								class="h-5 w-5 text-gray-400"
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
						<div class="space-y-3 text-sm text-gray-400">
							<div class="flex items-start gap-3">
								<span class="font-semibold text-gray-100">1.</span>
								<div>
									Go to{" "}
									<a
										href="https://accountscenter.instagram.com/info_and_permissions/"
										target="_blank"
										rel="noopener noreferrer"
										class="cursor-pointer text-pink underline decoration-pink underline-offset-4 transition-colors hover:text-purple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
									>
										Instagram Account Center
									</a>
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-gray-100">2.</span>
								<span>Click "Download your information"</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-gray-100">3.</span>
								<span>Select "All available information" or choose specific data types</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-gray-100">4.</span>
								<span>Choose your preferred date range</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-gray-100">5.</span>
								<span>Select "Low" media quality for better performance</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-gray-100">6.</span>
								<span class="font-semibold text-gray-100">
									IMPORTANT: Make sure the format is set to JSON (not HTML)
								</span>
							</div>
							<div class="flex items-start gap-3">
								<span class="font-semibold text-gray-100">7.</span>
								<span>
									Check your email for a notification that your data package is ready for download
								</span>
							</div>
						</div>
					</div>

					{/* Limitations */}
					<div class="mb-8 rounded-lg border border-gray-600/40 bg-gray-900/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:p-6">
						<h2 class="mb-4 flex items-center gap-2 font-sans text-lg font-semibold text-white">
							<svg
								class="h-5 w-5 text-gray-400"
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
						<ul class="space-y-2 text-sm text-gray-400">
							<li class="flex items-start gap-2">
								<span class="text-gray-500">•</span>
								<span>
									Instagram frequently changes their data format - we try to stay updated but some
									files may not parse correctly
								</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-gray-500">•</span>
								<span>Processing large datasets can be slow and memory-intensive</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-gray-500">•</span>
								<span>Instagram's data export can be incomplete or contain inconsistencies</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-gray-500">•</span>
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
