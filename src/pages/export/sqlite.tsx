import { type Component, Match, Show, Switch } from "solid-js";
import Layout from "@/components/Layout";
import { Button, NavigationLink, Panel } from "@/components/ui";
import {
	AdvancedOptions,
	DownloadReady,
	ExportStatus,
	SchemaPreview,
	TableSelection,
} from "@/components/export/SqliteExportSections";
import { useSqliteExport } from "@/pages/export/useSqliteExport";

const SqliteExport: Component = () => {
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
			<div class="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
				<div class="mb-6">
					<NavigationLink
						href="/export"
						class="mb-4 border-0 px-0 py-0 text-gray-400 hover:border-0 hover:bg-transparent hover:text-gray-100"
					>
						<span aria-hidden="true" class="mr-1">
							←
						</span>{" "}
						Back to Export Options
					</NavigationLink>
					<p class="mb-3 text-xs font-bold uppercase leading-4 tracking-[0.16em] text-purple-soft">
						Portable backup
					</p>
					<h1 class="mb-3 font-sans text-3xl font-semibold tracking-tight text-gray-100">
						SQLite database export
					</h1>
					<p class="text-base text-gray-400">
						Export your data to a portable SQL file that you can import into any SQLite database.
					</p>
				</div>

				<Show when={sqlInstance.error}>
					<div class="mb-6 rounded-lg border border-red-line bg-red-fill/60 p-4">
						<span class="text-red-soft">Failed to load SQL.js. Please refresh the page.</span>
					</div>
				</Show>

				<Panel class="mb-6 p-5 sm:p-6">
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

					<Button
						variant="primary"
						onClick={exportToSqlite}
						disabled={selectedTableCount() === 0 || isExporting() || !sqlInstance()}
					>
						<Switch fallback="Generate Database">
							<Match when={!sqlInstance()}>Loading...</Match>
							<Match when={isExporting()}>Generating...</Match>
						</Switch>
					</Button>
				</Panel>

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
