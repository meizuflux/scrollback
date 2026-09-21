import { type Component, Show } from "solid-js";
import { Button, Panel } from "@/components/ui";

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
		<Panel variant="raised" class="mb-8 p-7 text-center sm:p-10">
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

			<div class="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-purple-line bg-purple-fill/60 text-purple-soft">
				<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
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
			<h3 class="mb-3 font-sans text-xl font-semibold tracking-tight text-gray-100">
				Import your Instagram archive
			</h3>
			<p class="mx-auto mb-7 max-w-md text-sm text-gray-400 sm:text-base">
				Upload the zip file or extracted folder from your Instagram data download
			</p>

			<div class="mx-auto flex max-w-md flex-col justify-center gap-3 sm:flex-row">
				<Button
					variant="primary"
					class="w-full sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("zipPicker")}
					disabled={props.filePickerDisabled}
				>
					Select ZIP file
				</Button>
				<Button
					variant="secondary"
					class="w-full sm:w-auto sm:min-w-[156px]"
					onClick={() => chooseFile("folderPicker")}
					disabled={props.filePickerDisabled}
				>
					Select folder
				</Button>
			</div>
			<Button
				variant="ghost"
				class="mt-4"
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
			</Button>
			<p class="mt-5 text-sm text-gray-400">
				Your data stays on this device. Processing happens locally in your browser.
			</p>
		</Panel>
	);
};

export default ImportPicker;
