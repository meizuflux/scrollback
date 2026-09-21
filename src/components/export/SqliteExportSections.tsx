import { type Accessor, type Component, For, Show } from "solid-js";
import type { TableOption } from "@/utils/sqlite";
import { Button, Panel, TextInput } from "@/components/ui";

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
};

interface TableSelectionProps {
	tableOptions: Accessor<TableOption[]>;
	selectedCount: Accessor<number>;
	onToggle: (tableName: string) => void;
	onSelectAll: () => void;
	onSelectNone: () => void;
}

export const TableSelection: Component<TableSelectionProps> = (props) => (
	<div class="mb-6">
		<div class="mb-4 flex items-center justify-between gap-3">
			<h4 class="font-sans text-lg font-semibold tracking-tight text-gray-100">Select tables to export</h4>
			<div class="text-sm text-gray-400">
				<span class="font-mono font-medium text-gray-100">{props.selectedCount()}</span> of{" "}
				{props.tableOptions().length} selected
			</div>
		</div>

		<div class="mb-6 flex flex-wrap gap-2">
			<Button variant="primary" onClick={props.onSelectAll}>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
				</svg>
				Select All
			</Button>
			<Button variant="secondary" onClick={props.onSelectNone}>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
				Clear All
			</Button>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<For each={props.tableOptions()}>
				{(table) => (
					<label
						class="relative cursor-pointer rounded-xl border p-4 transition-colors focus-within:border-purple"
						classList={{
							"border-purple-line bg-purple-fill/30": table.enabled,
							"border-edge bg-panel hover:border-edge-strong": !table.enabled,
						}}
					>
						<input
							type="checkbox"
							checked={table.enabled}
							onChange={() => props.onToggle(table.name)}
							class="sr-only"
						/>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex items-center gap-2">
									<div class="text-sm font-semibold text-gray-100">{table.label}</div>
									<Show when={table.enabled}>
										<svg
											class="h-4 w-4 text-purple"
											fill="currentColor"
											viewBox="0 0 20 20"
											aria-hidden="true"
										>
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									</Show>
								</div>
								<div
									class="text-xs leading-relaxed"
									classList={{ "text-gray-400": table.enabled, "text-gray-500": !table.enabled }}
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
);

interface AdvancedOptionsProps {
	open: Accessor<boolean>;
	fileName: Accessor<string>;
	onToggle: () => void;
	onFileName: (value: string) => void;
}

export const AdvancedOptions: Component<AdvancedOptionsProps> = (props) => (
	<div class="mb-4">
		<button
			type="button"
			class="mb-3 flex cursor-pointer items-center text-sm font-semibold text-purple-soft transition-colors hover:text-purple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
			onClick={props.onToggle}
		>
			<svg
				class="mr-2 h-4 w-4 transition-transform"
				classList={{ "rotate-90": props.open() }}
				fill="currentColor"
				viewBox="0 0 20 20"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
					clip-rule="evenodd"
				/>
			</svg>
			Advanced Options
		</button>
		<Show when={props.open()}>
			<div class="space-y-4 rounded-xl border border-edge bg-panel p-4">
				<div>
					<label class="mb-2 block text-sm font-medium text-gray-400">Output filename</label>
					<TextInput
						type="text"
						value={props.fileName()}
						onInput={(event) => props.onFileName(event.currentTarget.value)}
						placeholder="instagram-data.sqlite"
					/>
				</div>
			</div>
		</Show>
	</div>
);

interface SchemaPreviewProps {
	open: Accessor<boolean>;
	schema: Accessor<string>;
	copyButtonText: Accessor<string>;
	onToggle: () => void;
	onCopy: () => void;
}

export const SchemaPreview: Component<SchemaPreviewProps> = (props) => (
	<div class="mb-4">
		<button
			type="button"
			class="mb-3 flex cursor-pointer items-center text-sm font-semibold text-purple-soft transition-colors hover:text-purple disabled:cursor-not-allowed disabled:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
			onClick={props.onToggle}
		>
			<svg
				class="mr-2 h-4 w-4 transition-transform"
				classList={{ "rotate-90": props.open() }}
				fill="currentColor"
				viewBox="0 0 20 20"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
					clip-rule="evenodd"
				/>
			</svg>
			View Generated SQL Schema
		</button>
		<Show when={props.open()}>
			<div class="relative rounded-xl border border-edge bg-panel p-4">
				<Button variant="secondary" size="sm" class="absolute right-3 top-3 z-10" onClick={props.onCopy}>
					{props.copyButtonText()}
				</Button>
				<Show when={props.schema()}>
					<pre class="max-h-[70vh] overflow-x-auto whitespace-pre pr-20 font-mono text-sm text-gray-400 md:max-h-[60vh]">
						<code class="text-gray-400">{props.schema()}</code>
					</pre>
				</Show>
				<Show when={!props.schema()}>
					<div class="py-8 text-center text-gray-500">
						<p>No tables selected</p>
						<p class="mt-1 text-xs">Select tables above to see the generated schema</p>
					</div>
				</Show>
			</div>
		</Show>
	</div>
);

interface ExportStatusProps {
	visible: Accessor<boolean>;
	progress: Accessor<number>;
	status: Accessor<string>;
}

export const ExportStatus: Component<ExportStatusProps> = (props) => (
	<Show when={props.visible()}>
		<Panel class="mb-4 p-5 sm:p-6">
			<h3 class="mb-4 font-sans text-lg font-semibold tracking-tight text-gray-100">Generating database</h3>
			<div class="mb-4">
				<div class="mb-2 h-3 rounded-full bg-gray-700">
					<div
						class="h-3 rounded-full bg-purple transition-all duration-500 ease-out"
						style={{ width: `${props.progress()}%` }}
					></div>
				</div>
				<p class="text-sm text-gray-400">
					{props.progress()}% - {props.status()}
				</p>
			</div>
		</Panel>
	</Show>
);

interface DownloadReadyProps {
	visible: Accessor<boolean>;
	fileName: Accessor<string>;
	fileSize: Accessor<number>;
	onDownload: () => void;
}

export const DownloadReady: Component<DownloadReadyProps> = (props) => (
	<Show when={props.visible()}>
		<Panel variant="raised" class="mb-4 p-5 text-center sm:p-6">
			<div class="text-center">
				<div class="mb-4">
					<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-purple-line text-purple-soft">
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							></path>
						</svg>
					</div>
				</div>
				<h3 class="mb-4 font-sans text-2xl font-semibold tracking-tight text-gray-100">Database ready</h3>
				<p class="mx-auto mb-6 max-w-lg text-gray-400">
					Your SQLite database has been generated successfully. Click the button below to download it.
				</p>
				<Button variant="primary" onClick={props.onDownload}>
					Download {props.fileName()} ({formatFileSize(props.fileSize())})
				</Button>
			</div>
		</Panel>
	</Show>
);
