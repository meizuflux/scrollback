import { type Accessor, type Component, For, Show } from "solid-js";
import type { TableOption } from "@/utils/sqlite";

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
		<div class="mb-4 flex items-center justify-between">
			<h4 class="text-lg font-semibold text-[#F2F2F2]">Select tables to export</h4>
			<div class="text-sm text-[#A3A3A3]">
				{props.selectedCount()} of {props.tableOptions().length} selected
			</div>
		</div>

		<div class="mb-6 flex gap-2">
			<button
				type="button"
				class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#F2F2F2] bg-[#F2F2F2] px-4 py-2.5 text-sm font-semibold leading-5 text-[#101010] transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
				onClick={props.onSelectAll}
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
				</svg>
				Select All
			</button>
			<button
				type="button"
				class="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#404040] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
				onClick={props.onSelectNone}
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<For each={props.tableOptions()}>
				{(table) => (
					<label
						class="relative cursor-pointer rounded-lg border p-4 transition-colors focus-within:border-[#7873F5]"
						classList={{
							"border-[#7873F5] bg-[#202020]": table.enabled,
							"border-[#303030] bg-[#141414] hover:border-[#4A4A4A]": !table.enabled,
						}}
					>
						<input
							type="checkbox"
							checked={table.enabled}
							onChange={() => props.onToggle(table.name)}
							class="sr-only"
						/>
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex items-center gap-2">
									<div class="text-sm font-semibold text-[#F2F2F2]">{table.label}</div>
									<Show when={table.enabled}>
										<svg class="h-4 w-4 text-[#7873F5]" fill="currentColor" viewBox="0 0 20 20">
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
									classList={{ "text-[#A3A3A3]": table.enabled, "text-[#737373]": !table.enabled }}
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
			class="mb-3 flex items-center text-sm font-semibold text-[#7873F5] transition-colors hover:text-[#FF6EC4]"
			onClick={props.onToggle}
		>
			<svg
				class="mr-2 h-4 w-4 transition-transform"
				classList={{ "rotate-90": props.open() }}
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
		<Show when={props.open()}>
			<div class="space-y-4 rounded-lg border border-[#303030] bg-[#141414] p-4">
				<div>
					<label class="mb-2 block text-sm font-medium text-[#A3A3A3]">Output filename</label>
					<input
						type="text"
						value={props.fileName()}
						onInput={(event) => props.onFileName(event.currentTarget.value)}
						class="min-h-10 w-full rounded-lg border border-[#303030] bg-[#141414] px-3 py-2.5 text-sm leading-5 text-[#F2F2F2] outline-none placeholder:text-[#737373] transition-colors hover:border-[#4A4A4A] focus:border-[#7873F5] focus:bg-[#181818] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
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
			class="mb-3 flex items-center text-sm font-semibold text-[#7873F5] transition-colors hover:text-[#FF6EC4] disabled:cursor-not-allowed disabled:text-[#737373]"
			onClick={props.onToggle}
		>
			<svg
				class="mr-2 h-4 w-4 transition-transform"
				classList={{ "rotate-90": props.open() }}
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
		<Show when={props.open()}>
			<div class="relative rounded-lg border border-[#303030] bg-[#141414] p-4">
				<button
					type="button"
					class="absolute right-3 top-3 z-10 inline-flex min-h-8 items-center justify-center rounded-lg border border-[#404040] bg-transparent px-3 py-1 text-xs font-semibold text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
					onClick={props.onCopy}
				>
					{props.copyButtonText()}
				</button>
				<Show when={props.schema()}>
					<pre class="max-h-[70vh] overflow-x-auto whitespace-pre pr-20 font-mono text-sm text-[#A3A3A3] md:max-h-[60vh]">
						<code class="text-[#A3A3A3]">{props.schema()}</code>
					</pre>
				</Show>
				<Show when={!props.schema()}>
					<div class="py-8 text-center text-[#737373]">
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
		<div class="mb-4 rounded-lg border border-[#303030] bg-[#181818] p-5 sm:p-6">
			<h3 class="mb-4 text-lg font-semibold text-[#F2F2F2]">Generating database</h3>
			<div class="mb-4">
				<div class="mb-2 h-3 rounded-full bg-[#303030]">
					<div
						class="h-3 rounded-full bg-gradient-to-r from-[#FF6EC4] to-[#7873F5] transition-all duration-500 ease-out"
						style={`width: ${props.progress()}%`}
					></div>
				</div>
				<p class="text-sm text-[#A3A3A3]">
					{props.progress()}% - {props.status()}
				</p>
			</div>
		</div>
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
		<div class="mb-4 rounded-lg border border-[#303030] bg-[#181818] p-5 sm:p-6">
			<div class="text-center">
				<div class="mb-4">
					<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#7873F5] text-[#FF6EC4]">
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
					Your SQLite database has been generated successfully. Click the button below to download it.
				</p>
				<button
					type="button"
					class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#F2F2F2] bg-[#F2F2F2] px-4 py-2.5 text-base font-semibold leading-5 text-[#101010] transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
					onClick={props.onDownload}
				>
					Download {props.fileName()} ({formatFileSize(props.fileSize())})
				</button>
			</div>
		</div>
	</Show>
);
