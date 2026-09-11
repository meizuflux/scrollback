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
			const blob = new Blob([Uint8Array.from(binaryArray)], { type: "application/x-sqlite3" });
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
			<div class="container mx-auto max-w-5xl px-4 py-7 sm:px-6">
				<div class="mb-6">
					<button
						type="button"
						class="mb-4 flex items-center text-sm text-[#A3A3A3] transition-colors hover:text-[#F2F2F2]"
						onClick={() => navigate("/export")}
					>
						← Back to Export Options
					</button>
					<p class="mb-3 text-xs font-bold uppercase tracking-[0.16em] leading-4 text-[#4A99F8]">
						Portable backup
					</p>
					<h1 class="mb-3 text-3xl font-semibold tracking-tight text-[#F2F2F2]">SQLite database export</h1>
					<p class="text-base text-[#A3A3A3]">
						Export your data to a portable SQL file that you can import into any SQLite database.
					</p>
				</div>

				{/* WASM Loading Status */}
				<Show when={wasmLoaded() === false}>
					<div class="mb-6 rounded-lg border border-[#713D3D] bg-[#211515] p-4">
						<span class="text-[#E7B7B7]">Failed to load SQL.js. Please refresh the page.</span>
					</div>
				</Show>

				<div class="mb-6 rounded-lg border border-[#303030] bg-[#181818] p-5 sm:p-6">
					{/* Table Selection */}
					<div class="mb-6">
						<div class="flex items-center justify-between mb-4">
							<h4 class="text-lg font-semibold text-[#F2F2F2]">Select tables to export</h4>
							<div class="text-sm text-[#A3A3A3]">
								{tableOptions().filter((t) => t.enabled).length} of {tableOptions().length} selected
							</div>
						</div>

						<div class="flex gap-2 mb-6">
							<button
								type="button"
								class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#F2F2F2] bg-[#F2F2F2] px-4 py-2.5 text-sm font-semibold leading-5 text-[#101010] transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A99F8]"
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
								type="button"
								class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#404040] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A99F8]"
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
									<label
										class="relative cursor-pointer rounded-lg border p-4 transition-colors focus-within:border-[#4A99F8]"
										classList={{
											"border-[#4A99F8] bg-[#202020]": table.enabled,
											"border-[#303030] bg-[#141414] hover:border-[#4A4A4A]": !table.enabled,
										}}
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
													<div class="text-sm font-semibold text-[#F2F2F2]">
														{table.label}
													</div>
													{table.enabled && (
														<svg
															class="h-4 w-4 text-[#4A99F8]"
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
													class="text-xs leading-relaxed"
													classList={{
														"text-[#A3A3A3]": table.enabled,
														"text-[#737373]": !table.enabled,
													}}
												>
													{table.description}
												</div>
											</div>
										</div>
									</label>
								)}
							</For>
						</div>
					</div>

					{/* Advanced Options */}
					<div class="mb-4">
						<button
							type="button"
							class="mb-3 flex items-center text-sm font-semibold text-[#4A99F8] transition-colors hover:text-[#8BC1FF]"
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
							<div class="space-y-4 rounded-lg border border-[#303030] bg-[#141414] p-4">
								<div>
									<label class="mb-2 block text-sm font-medium text-[#A3A3A3]">Output filename</label>
									<input
										type="text"
										value={fileName()}
										onInput={(e) => setFileName(e.target.value)}
										class="w-full min-h-10 rounded-lg border border-[#303030] bg-[#141414] px-3 py-2.5 text-sm leading-5 text-[#F2F2F2] outline-none placeholder:text-[#737373] transition-colors hover:border-[#4A4A4A] focus:border-[#4A99F8] focus:bg-[#181818] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A99F8]"
										placeholder="instagram-data.sqlite"
									/>
								</div>
							</div>
						</Show>
					</div>

					{/* Schema Preview */}
					<div class="mb-4">
						<button
							type="button"
							class="mb-3 flex items-center text-sm font-semibold text-[#4A99F8] transition-colors hover:text-[#8BC1FF] disabled:cursor-not-allowed disabled:text-[#737373]"
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
							<div class="relative rounded-lg border border-[#303030] bg-[#141414] p-4">
								<button
									type="button"
									class="absolute right-3 top-3 z-10 inline-flex min-h-8 items-center justify-center rounded-lg border border-[#404040] bg-transparent px-3 py-1 text-xs font-semibold text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A99F8]"
									onClick={copySchemaToClipboard}
								>
									{copyButtonText()}
								</button>
								<Show when={generatedSchema()}>
									<pre class="max-h-[70vh] overflow-x-auto whitespace-pre pr-20 font-mono text-sm text-[#A3A3A3] md:max-h-[60vh]">
										<code class="text-[#A3A3A3]">{generatedSchema()}</code>
									</pre>
								</Show>
								<Show when={!generatedSchema()}>
									<div class="py-8 text-center text-[#737373]">
										<p>No tables selected</p>
										<p class="text-xs mt-1">Select tables above to see the generated schema</p>
									</div>
								</Show>
							</div>
						</Show>
					</div>

					<button
						type="button"
						class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#F2F2F2] bg-[#F2F2F2] px-4 py-2.5 text-sm font-semibold leading-5 text-[#101010] transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A99F8] disabled:cursor-not-allowed disabled:opacity-50"
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
					<div class="mb-4 rounded-lg border border-[#303030] bg-[#181818] p-5 sm:p-6">
						<h3 class="mb-4 text-lg font-semibold text-[#F2F2F2]">Generating database</h3>
						<div class="mb-4">
							<div class="mb-2 h-3 rounded-full bg-[#303030]">
								<div
									class="h-3 rounded-full bg-[#4A99F8] transition-all duration-500 ease-out"
									style={`width: ${exportProgress()}%`}
								></div>
							</div>
							<p class="text-sm text-[#A3A3A3]">
								{exportProgress()}% - {exportStatus()}
							</p>
						</div>
					</div>
				</Show>

				{/* Download Ready */}
				<Show when={isComplete() && downloadUrl()}>
					<div class="mb-4 rounded-lg border border-[#303030] bg-[#181818] p-5 sm:p-6">
						<div class="text-center">
							<div class="mb-4">
								<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#4A99F8] text-[#4A99F8]">
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										></path>
									</svg>
								</div>
							</div>
							<h3 class="mb-4 text-2xl font-semibold text-[#F2F2F2]">Database ready</h3>
							<p class="mx-auto mb-6 max-w-lg text-[#A3A3A3]">
								Your SQLite database has been generated successfully. Click the button below to download
								it.
							</p>
							<button
								type="button"
								class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#F2F2F2] bg-[#F2F2F2] px-4 py-2.5 text-base font-semibold leading-5 text-[#101010] transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A99F8]"
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
