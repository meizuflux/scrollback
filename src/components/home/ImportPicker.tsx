import type { Component } from "solid-js";

interface ImportPickerProps {
	filePickerDisabled: boolean;
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
		<div class="mb-8 rounded-lg border border-[#303030] bg-[#181818] p-7 text-center sm:p-10">
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

			<div class="mx-auto mb-5 flex h-8 w-8 items-center justify-center text-[#A3A3A3]">
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
			<h3 class="mb-3 text-xl font-semibold text-[#F2F2F2]">Import your Instagram archive</h3>
			<p class="mx-auto mb-7 max-w-md text-sm text-[#A3A3A3] sm:text-base">
				Upload the zip file or extracted folder from your Instagram data download
			</p>

			<div class="mx-auto flex max-w-md flex-col justify-center gap-3 sm:flex-row">
				<button
					type="button"
					class="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#F2F2F2] bg-[#F2F2F2] px-4 py-2.5 text-sm font-semibold leading-5 text-[#101010] transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5] sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("zipPicker")}
				>
					Select ZIP file
				</button>
				<button
					type="button"
					class="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#404040] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5] sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("folderPicker")}
				>
					Select folder
				</button>
			</div>
			<button
				type="button"
				class="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-[#7873F5] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5] disabled:cursor-not-allowed disabled:opacity-50"
				onClick={props.onTryDemo}
			>
				Try demo
			</button>
			<p class="mt-5 text-sm text-[#A3A3A3]">
				Your data stays on this device. Processing happens locally in your browser.
			</p>
		</div>
	);
};

export default ImportPicker;
