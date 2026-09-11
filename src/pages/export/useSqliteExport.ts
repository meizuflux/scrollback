import { createMemo, createResource, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
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

export const useSqliteExport = () => {
	const navigate = useNavigate();
	const [exportProgress, setExportProgress] = createSignal(0);
	const [exportStatus, setExportStatus] = createSignal("");
	const [isExporting, setIsExporting] = createSignal(false);
	const [isComplete, setIsComplete] = createSignal(false);
	const [downloadUrl, setDownloadUrl] = createSignal("");
	const [fileName, setFileName] = createSignal("instagram-data.sqlite");
	const [fileSize, setFileSize] = createSignal(0);
	const [showAdvanced, setShowAdvanced] = createSignal(false);
	const [showSchema, setShowSchema] = createSignal(false);
	const [copyButtonText, setCopyButtonText] = createSignal("Copy");
	const [tableOptions, setTableOptions] = createSignal<TableOption[]>(getDefaultTables());

	const enabledTables = createMemo(() =>
		tableOptions()
			.filter((table) => table.enabled)
			.map((table) => table.name),
	);
	const selectedTableCount = createMemo(() => enabledTables().length);
	const generatedSchema = createMemo(() => generateSchemaFromDb(enabledTables()));

	// Preload SQL.js WASM while the page is being displayed.
	const [sqlInstance] = createResource<SqlJsStatic>(async () => {
		try {
			return await initSqlJs({ locateFile: () => sqliteWasmUrl });
		} catch (error) {
			console.error("Failed to load SQL.js:", error);
			throw error;
		}
	});

	onMount(() => {
		if (!isDataLoaded()) navigate("/", { replace: true });
	});

	const toggleTable = (tableName: string) => {
		setTableOptions((prev) =>
			prev.map((table) => (table.name === tableName ? { ...table, enabled: !table.enabled } : table)),
		);
	};

	const selectAllTables = () => setTableOptions((prev) => prev.map((table) => ({ ...table, enabled: true })));
	const selectNoTables = () => setTableOptions((prev) => prev.map((table) => ({ ...table, enabled: false })));

	const exportToSqlite = async () => {
		setIsExporting(true);
		setIsComplete(false);
		setExportProgress(0);
		setExportStatus("Initializing...");
		setFileSize(0);

		const selectedTables = enabledTables();
		if (selectedTables.length === 0) {
			setExportStatus("Error: No tables selected for export");
			setIsExporting(false);
			return;
		}

		if (!sqlInstance()) {
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
			createTableStatements(selectedTables).forEach((statement) => sqliteDb.run(statement));
			createIndexStatements(selectedTables).forEach((statement) => sqliteDb.run(statement));
			setExportProgress(15);

			setExportStatus("Fetching data from local database...");
			const data = await fetchAllData(selectedTables);
			const mediaMetadataMap = new Map(data.mediaMetadata.map((media) => [media.uri, media]));
			setExportProgress(20);
			setExportProgress(25);

			await insertTableData(sqliteDb, selectedTables, data, mediaMetadataMap, (tableName, progress) => {
				setExportStatus(`Exporting ${tableName.toLowerCase()}...`);
				setExportProgress(Math.round(25 + progress * 0.6));
			});

			setExportProgress(90);
			setExportStatus("Finalizing database...");
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

	const downloadDatabase = () => {
		if (!downloadUrl()) return;

		const link = document.createElement("a");
		link.href = downloadUrl();
		link.download = fileName();
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		setExportStatus("Download started!");
		setTimeout(() => {
			if (downloadUrl()) {
				URL.revokeObjectURL(downloadUrl());
				setDownloadUrl("");
			}
		}, 1000);
	};

	const copySchemaToClipboard = async () => {
		if (!generatedSchema()) {
			setCopyButtonText("No schema");
			setTimeout(() => setCopyButtonText("Copy"), 2000);
			return;
		}

		try {
			await navigator.clipboard.writeText(generatedSchema());
			setCopyButtonText("Copied!");
			setTimeout(() => setCopyButtonText("Copy"), 2000);
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);
			setCopyButtonText("Failed");
			setTimeout(() => setCopyButtonText("Copy"), 2000);
		}
	};

	return {
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
	};
};
