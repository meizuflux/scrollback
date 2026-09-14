import { type Component, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Layout from "@/components/Layout";
import {
	AdvancedOptions,
	DownloadReady,
	ExportStatus,
	SchemaPreview,
	TableSelection,
} from "@/components/export/SqliteExportSections";
import { useSqliteExport } from "@/pages/export/useSqliteExport";

const SqliteExport: Component = () => {
	const navigate = useNavigate();
	const {
		sqlInstance,
		tableOptions,
		selectedTableCount,
		generatedSchema,
		exportProgress,
		exportStatus,
		isExporting,
		isComplete,
		downloadUrl,
		fileName,
		fileSize,
		showAdvanced,
		showSchema,
		copyButtonText,
		setFileName,
		setShowAdvanced,
		setShowSchema,
		toggleTable,
		selectAllTables,
		selectNoTables,
		exportToSqlite,
		downloadDatabase,
		copySchemaToClipboard,
	} = useSqliteExport();

	return (
		<Layout>
			<div class="container mx-auto max-w-5xl px-4 py-7 sm:px-6">
				<div class="mb-6">
					<button
						type="button"
						class="mb-4 flex cursor-pointer items-center text-sm text-gray-400 transition-colors hover:text-gray-100"
						onClick={() => navigate("/export")}
					>
						← Back to Export Options
					</button>
					<p class="mb-3 bg-gradient-to-r from-pink to-purple bg-clip-text text-xs font-bold uppercase leading-4 tracking-[0.16em] text-transparent">
						Portable backup
					</p>
					<h1 class="mb-3 font-sans text-3xl font-semibold tracking-tight text-white">SQLite database export</h1>
					<p class="text-base text-gray-400">
						Export your data to a portable SQL file that you can import into any SQLite database.
					</p>
				</div>

				<Show when={sqlInstance.error}>
					<div class="mb-6 rounded-lg border border-red/60 bg-red/10 p-4">
						<span class="text-red">Failed to load SQL.js. Please refresh the page.</span>
					</div>
				</Show>

				<div class="mb-6 rounded-lg border border-gray-600/40 bg-gray-900/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] sm:p-6">
					<TableSelection
						tableOptions={tableOptions}
						selectedCount={selectedTableCount}
						onToggle={toggleTable}
						onSelectAll={selectAllTables}
						onSelectNone={selectNoTables}
					/>

					<AdvancedOptions
						open={showAdvanced}
						fileName={fileName}
						onToggle={() => setShowAdvanced((open) => !open)}
						onFileName={(value) => setFileName(value)}
					/>

					<SchemaPreview
						open={showSchema}
						schema={generatedSchema}
						copyButtonText={copyButtonText}
						onToggle={() => setShowSchema((open) => !open)}
						onCopy={copySchemaToClipboard}
					/>

					<button
						type="button"
						class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-pink bg-pink px-4 py-2.5 text-sm font-semibold leading-5 text-gray-950 shadow-[0_8px_24px_rgba(255,110,196,0.14)] transition-colors hover:border-[#ffb1df] hover:bg-[#ffb1df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink disabled:cursor-not-allowed disabled:opacity-50"
						onClick={exportToSqlite}
						disabled={selectedTableCount() === 0 || isExporting() || !sqlInstance()}
					>
						{!sqlInstance() ? "Loading..." : isExporting() ? "Generating..." : "Generate Database"}
					</button>
				</div>

				<ExportStatus visible={isExporting} progress={exportProgress} status={exportStatus} />
				<DownloadReady
					visible={() => isComplete() && Boolean(downloadUrl())}
					fileName={fileName}
					fileSize={fileSize}
					onDownload={downloadDatabase}
				/>
			</div>
		</Layout>
	);
};

export default SqliteExport;
