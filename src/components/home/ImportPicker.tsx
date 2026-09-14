import { type Component, Show } from "solid-js";

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
		<div class="mb-8 rounded-lg border border-pink/35 bg-[radial-gradient(circle_at_88%_18%,rgba(121,115,245,0.2),transparent_16rem),linear-gradient(145deg,rgba(39,27,43,0.96),rgba(24,24,24,0.96))] p-7 shadow-[0_18px_50px_rgba(0,0,0,0.16)] text-center sm:p-10">
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

			<div class="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-purple/50 bg-purple/10 text-purple shadow-[0_0_24px_rgba(120,115,245,0.12)]">
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
			<h3 class="mb-3 font-sans text-xl font-semibold text-white">Import your Instagram archive</h3>
			<p class="mx-auto mb-7 max-w-md text-sm text-gray-400 sm:text-base">
				Upload the zip file or extracted folder from your Instagram data download
			</p>

			<div class="mx-auto flex max-w-md flex-col justify-center gap-3 sm:flex-row">
				<button
					type="button"
					class="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-pink bg-pink px-4 py-2.5 text-sm font-semibold leading-5 text-gray-950 shadow-[0_8px_24px_rgba(255,110,196,0.14)] transition-colors hover:border-[#ff9ad8] hover:bg-[#ff9ad8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("zipPicker")}
					disabled={props.filePickerDisabled}
				>
					Select ZIP file
				</button>
				<button
					type="button"
					class="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:border-purple hover:bg-purple/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("folderPicker")}
					disabled={props.filePickerDisabled}
				>
					Select folder
				</button>
			</div>
			<button
				type="button"
				class="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-purple/70 bg-purple/10 px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:bg-purple/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-not-allowed disabled:opacity-50"
				onClick={props.onTryDemo}
				disabled={!props.demoManifestReady}
				aria-busy={!props.demoManifestReady}
			>
				<Show
					when={props.demoManifestReady}
					fallback={
						<span class="flex items-center justify-center gap-2">
							<span
								class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-gray-100"
								aria-hidden="true"
							/>
							Loading demo manifest...
						</span>
					}
				>
					Try demo
				</Show>
			</button>
			<p class="mt-5 text-sm text-gray-400">
				Your data stays on this device. Processing happens locally in your browser.
			</p>
		</div>
	);
};

export default ImportPicker;
