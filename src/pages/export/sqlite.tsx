import { type Component, createSignal, onMount, Show, For, createResource } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Layout from "@/components/Layout";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import sqliteWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import {
	type TableOption,
	getDefaultTables,
	generateSchemaFromDb,
	createTableStatements,
	createIndexStatements,
	fetchAllData,
	insertTableData,
} from "@/utils/sqlite";
import { isDataLoaded } from "@/utils/storage";

const SqliteExport: Component = () => {
	const navigate = useNavigate();
	const [exportProgress, setExportProgress] = createSignal(0);
	const [exportStatus, setExportStatus] = createSignal("");
	const [isExporting, setIsExporting] = createSignal(false);
	const [isComplete, setIsComplete] = createSignal(false);
	const [downloadUrl, setDownloadUrl] = createSignal<string>("");
	const [fileName, setFileName] = createSignal("instagram-data.sqlite");
	const [fileSize, setFileSize] = createSignal<number>(0);
	const [showAdvanced, setShowAdvanced] = createSignal(false);
	const [showSchema, setShowSchema] = createSignal(false);
	const [generatedSchema, setGeneratedSchema] = createSignal("");
	const [sqlInstance, setSqlInstance] = createSignal<SqlJsStatic | null>(null);
	const [copyButtonText, setCopyButtonText] = createSignal("Copy");

	// Preload SQL.js WASM
	const [wasmLoaded] = createResource(async () => {
		try {
			const SQL = await initSqlJs({
				locateFile: () => sqliteWasmUrl,
			});
			setSqlInstance(SQL);
			return true;
		} catch (error) {
			console.error("Failed to load SQL.js:", error);
			return false;
		}
	});

	const [tableOptions, setTableOptions] = createSignal<TableOption[]>(getDefaultTables());

	// Update schema whenever table options change
	const updateSchema = () => {
		const enabledTables = tableOptions()
			.filter((t) => t.enabled)
			.map((t) => t.name);
		setGeneratedSchema(generateSchemaFromDb(enabledTables));
	};

	onMount(() => {
		if (!isDataLoaded()) {
			navigate("/", { replace: true });
		}
		// Initialize schema
		updateSchema();
	});

	const toggleTable = (tableName: string) => {
		setTableOptions((prev) =>
			prev.map((table) => (table.name === tableName ? { ...table, enabled: !table.enabled } : table)),
		);
		updateSchema();
	};

	const selectAllTables = () => {
		setTableOptions((prev) => prev.map((table) => ({ ...table, enabled: true })));
		updateSchema();
	};

	const selectNoTables = () => {
		setTableOptions((prev) => prev.map((table) => ({ ...table, enabled: false })));
		updateSchema();
	};

	const exportToSqlite = async () => {
		setIsExporting(true);
		setIsComplete(false);
		setExportProgress(0);
		setExportStatus("Initializing...");
		setFileSize(0);

		const enabledTables = tableOptions()
			.filter((t) => t.enabled)
			.map((t) => t.name);
		if (enabledTables.length === 0) {
			setExportStatus("Error: No tables selected for export");
			setIsExporting(false);
			return;
		}

		if (!wasmLoaded()) {
			setExportStatus("Error: SQL.js WASM not loaded yet");
			setIsExporting(false);
			return;
		}

		try {
			const SQL = sqlInstance();
			if (!SQL) {
				setExportStatus("Error: SQL.js not initialized");
				setIsExporting(false);
				return;
			}
			setExportProgress(5);

			setExportStatus("Creating database...");
			const sqliteDb: Database = new SQL.Database();
			setExportProgress(10);

			setExportStatus("Creating tables...");
			const tableStatements = createTableStatements(enabledTables);
			tableStatements.forEach((statement) => sqliteDb.run(statement));

			const indexStatements = createIndexStatements(enabledTables);
			indexStatements.forEach((statement) => sqliteDb.run(statement));

			// Generate and store the actual schema
			setGeneratedSchema(generateSchemaFromDb(enabledTables));
			setExportProgress(15);

			setExportStatus("Fetching data from local database...");
			const data = await fetchAllData(enabledTables);

			const mediaMetadataMap = new Map(data.mediaMetadata.map((m) => [m.uri, m]));
			setExportProgress(20);

			// Export data for each enabled table with progress updates
			setExportProgress(25);

			await insertTableData(sqliteDb, enabledTables, data, mediaMetadataMap, (tableName, progress) => {
				setExportStatus(`Exporting ${tableName.toLowerCase()}...`);
				// Map table progress (0-100) to overall progress (25-85)
				const overallProgress = 25 + progress * 0.6;
				setExportProgress(Math.round(overallProgress));
			});

			setExportProgress(90);
			setExportStatus("Finalizing database...");

			// Run VACUUM to optimize the database
			sqliteDb.run("VACUUM;");

			const binaryArray = sqliteDb.export();
			sqliteDb.close();
			setExportProgress(95);

			setExportStatus("Preparing download...");
			const blob = new Blob([binaryArray], { type: "application/x-sqlite3" });
			setDownloadUrl(URL.createObjectURL(blob));
			setFileSize(blob.size);

			setExportProgress(100);
			setExportStatus("Database ready for download!");
			setIsComplete(true);
		} catch (error) {
			console.error("Export error:", error);
			setExportStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
			setIsComplete(false);
		} finally {
			setIsExporting(false);
		}
	};

	const formatFileSize = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
	};

	const downloadDatabase = () => {
		if (!downloadUrl()) return;

		const a = document.createElement("a");
		a.href = downloadUrl();
		a.download = fileName();
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		// Show success feedback
		setExportStatus("Download started!");
		setTimeout(() => {
			if (downloadUrl()) {
				URL.revokeObjectURL(downloadUrl());
				setDownloadUrl("");
			}
		}, 1000);
	};

	const copySchemaToClipboard = async () => {
		const schema = generatedSchema();
		if (!schema) {
			setCopyButtonText("No schema");
			setTimeout(() => setCopyButtonText("Copy"), 2000);
			return;
		}

		try {
			await navigator.clipboard.writeText(schema);
			setCopyButtonText("Copied!");
			setTimeout(() => setCopyButtonText("Copy"), 2000);
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);
			setCopyButtonText("Failed");
			setTimeout(() => setCopyButtonText("Copy"), 2000);
		}
	};

	return (
		<Layout>
			<div class="container mx-auto p-4">
				<div class="mb-6">
					<button
						class="text-gray-400 hover:text-white mb-4 flex items-center"
						onClick={() => navigate("/export")}
					>
						← Back to Export Options
					</button>
					<h1 class="text-4xl font-bold mb-4 text-white">SQLite Database Export</h1>
					<p class="text-gray-300">
						Export your data to a portable SQL file that you can import into any SQLite database.
					</p>
				</div>

				{/* WASM Loading Status */}
				<Show when={wasmLoaded() === false}>
					<div class="bg-red-800 border border-red-600 rounded-lg p-4 mb-6">
						<span class="text-red-200">Failed to load SQL.js. Please refresh the page.</span>
					</div>
				</Show>

				<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
					{/* Table Selection */}
					<div class="mb-6">
						<div class="flex items-center justify-between mb-4">
							<h4 class="text-lg font-medium text-white">Select Tables to Export</h4>
							<div class="text-sm text-gray-400">
								{tableOptions().filter((t) => t.enabled).length} of {tableOptions().length} selected
							</div>
						</div>

						<div class="flex gap-2 mb-6">
							<button
								class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
								onClick={selectAllTables}
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path>
								</svg>
								Select All
							</button>
							<button
								class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
								onClick={selectNoTables}
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
								Clear All
							</button>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<For each={tableOptions()}>
								{(table) => (
									<div
										class="relative p-4 rounded-lg cursor-pointer transition-all duration-200 border-2"
										classList={{
											"bg-gray-700 border-blue-500 shadow-lg shadow-blue-500/10": table.enabled,
											"bg-gray-700 border-gray-600 hover:bg-gray-650 hover:border-gray-500":
												!table.enabled,
										}}
										onClick={() => toggleTable(table.name)}
									>
										<input
											type="checkbox"
											checked={table.enabled}
											onChange={() => toggleTable(table.name)}
											class="sr-only"
										/>
										<div class="flex items-start justify-between">
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2 mb-2">
													<div class="font-semibold text-sm transition-colors text-gray-200">
														{table.label}
													</div>
													{table.enabled && (
														<svg
															class="w-4 h-4 text-blue-400"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																fill-rule="evenodd"
																d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																clip-rule="evenodd"
															/>
														</svg>
													)}
												</div>
												<div
													class="text-xs leading-relaxed transition-colors"
													classList={{
														"text-gray-300": table.enabled,
														"text-gray-400": !table.enabled,
													}}
												>
													{table.description}
												</div>
											</div>
										</div>
									</div>
								)}
							</For>
						</div>
					</div>

					{/* Advanced Options */}
					<div class="mb-4">
						<button
							class="text-blue-400 hover:text-blue-300 mb-3 flex items-center"
							onClick={() => setShowAdvanced(!showAdvanced())}
						>
							<svg
								class="w-4 h-4 mr-2 transition-transform"
								classList={{ "rotate-90": showAdvanced() }}
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							Advanced Options
						</button>
						<Show when={showAdvanced()}>
							<div class="bg-gray-700 rounded p-4 space-y-4">
								<div>
									<label class="block text-sm font-medium text-gray-300 mb-2">Output Filename</label>
									<input
										type="text"
										value={fileName()}
										onInput={(e) => setFileName(e.target.value)}
										class="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
										placeholder="instagram-data.sqlite"
									/>
								</div>
							</div>
						</Show>
					</div>

					{/* Schema Preview */}
					<div class="mb-4">
						<button
							class="text-blue-400 hover:text-blue-300 mb-3 flex items-center disabled:text-gray-500 disabled:cursor-not-allowed"
							onClick={() => setShowSchema(!showSchema())}
						>
							<svg
								class="w-4 h-4 mr-2 transition-transform"
								classList={{ "rotate-90": showSchema() }}
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							View Generated SQL Schema
						</button>
						<Show when={showSchema()}>
							<div class="bg-gray-900 rounded-lg p-4 relative border border-gray-700">
								<button
									class="absolute top-3 right-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm z-10 transition-colors"
									onClick={copySchemaToClipboard}
								>
									{copyButtonText()}
								</button>
								<Show when={generatedSchema()}>
									<pre class="text-green-400 text-sm overflow-x-auto whitespace-pre pr-20 max-h-[70vh] md:max-h-[60vh] font-mono">
										<code class="text-green-400">{generatedSchema()}</code>
									</pre>
								</Show>
								<Show when={!generatedSchema()}>
									<div class="text-gray-500 text-center py-8">
										<p>No tables selected</p>
										<p class="text-xs mt-1">Select tables above to see the generated schema</p>
									</div>
								</Show>
							</div>
						</Show>
					</div>

					<button
						class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
						onClick={exportToSqlite}
						disabled={
							tableOptions().filter((t) => t.enabled).length === 0 ||
							isExporting() ||
							wasmLoaded() !== true
						}
					>
						{wasmLoaded() !== true ? "Loading..." : isExporting() ? "Generating..." : "Generate Database"}
					</button>
				</div>

				{/* Export Status */}
				<Show when={isExporting()}>
					<div class="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-4">
						<h3 class="text-xl font-semibold text-white mb-4">Generating Database...</h3>
						<div class="mb-4">
							<div class="bg-gray-700 rounded-full h-4 mb-2">
								<div
									class="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
									style={`width: ${exportProgress()}%`}
								></div>
							</div>
							<p class="text-gray-300 text-sm">
								{exportProgress()}% - {exportStatus()}
							</p>
						</div>
					</div>
				</Show>

				{/* Download Ready */}
				<Show when={isComplete() && downloadUrl()}>
					<div class="bg-green-800 rounded-lg p-6 border border-green-600 mb-4">
						<div class="text-center">
							<div class="mb-4">
								<div class="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
									<svg
										class="w-8 h-8 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										></path>
									</svg>
								</div>
							</div>
							<h3 class="text-2xl font-semibold text-white mb-4">Database Ready!</h3>
							<p class="text-gray-300 mb-6">
								Your SQLite database has been generated successfully. Click the button below to download
								it.
							</p>
							<button
								class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded transition-colors text-lg"
								onClick={downloadDatabase}
							>
								Download {fileName()} ({formatFileSize(fileSize())})
							</button>
						</div>
					</div>
				</Show>
			</div>
		</Layout>
	);
};

export default SqliteExport;
