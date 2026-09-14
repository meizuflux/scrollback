import type { Component } from "solid-js";

interface ImportPickerProps {
	filePickerDisabled: boolean;
	demoManifestReady: boolean;
	onFiles: (files: FileList) => void;
	onTryDemo: () => void;
}

const ImportPicker: Component<ImportPickerProps> = (props) => {
	const chooseFile = (id: string) => document.getElementById(id)?.click();
	const handleChange = (event: Event) => {
		const files = (event.currentTarget as HTMLInputElement).files;
		if (files) props.onFiles(files);
	};

	return (
		<div class="mb-8 rounded-lg border border-gray-700 bg-gray-900 p-7 text-center sm:p-10">
			<input
				type="file"
				accept=".zip"
				id="zipPicker"
				class="hidden"
				disabled={props.filePickerDisabled}
				onChange={handleChange}
			/>
			<input
				type="file"
				/* @ts-expect-error */
				webkitdirectory
				directory
				multiple
				id="folderPicker"
				class="hidden"
				disabled={props.filePickerDisabled}
				onChange={handleChange}
			/>

			<div class="mx-auto mb-5 flex h-8 w-8 items-center justify-center text-gray-400">
				<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
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
			<h3 class="mb-3 text-xl font-semibold text-gray-100">Import your Instagram archive</h3>
			<p class="mx-auto mb-7 max-w-md text-sm text-gray-400 sm:text-base">
				Upload the zip file or extracted folder from your Instagram data download
			</p>

			<div class="mx-auto flex max-w-md flex-col justify-center gap-3 sm:flex-row">
				<button
					type="button"
					class="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-100 bg-gray-100 px-4 py-2.5 text-sm font-semibold leading-5 text-gray-950 transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("zipPicker")}
				>
					Select ZIP file
				</button>
				<button
					type="button"
					class="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:border-gray-500 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("folderPicker")}
				>
					Select folder
				</button>
			</div>
			<button
				type="button"
				class="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-purple bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-not-allowed disabled:opacity-50"
				onClick={props.onTryDemo}
				disabled={!props.demoManifestReady}
				aria-busy={!props.demoManifestReady}
			>
				{props.demoManifestReady ? (
					"Try demo"
				) : (
					<span class="flex items-center justify-center gap-2">
						<span
							class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-gray-100"
							aria-hidden="true"
						/>
						Loading demo manifest...
					</span>
				)}
			</button>
			<p class="mt-5 text-sm text-gray-400">
				Your data stays on this device. Processing happens locally in your browser.
			</p>
		</div>
	);
};

export default ImportPicker;
