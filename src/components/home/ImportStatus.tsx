import { type Component, Show } from "solid-js";
import ImportProgress from "@/components/ImportProgress";
import type { ImportStep } from "@/import/import";

interface ImportStatusProps {
	isImporting: boolean;
	importAborted: boolean;
	steps: ImportStep[];
	showAbortMessage: boolean;
	errorMessage: string;
	demoMode: boolean;
	onStop?: () => void;
	onRetryDemo: () => void;
	onDismissError: () => void;
}

const ImportStatus: Component<ImportStatusProps> = (props) => (
	<>
		<Show when={props.isImporting}>
			<div class="mb-8 rounded-lg border border-gray-700 bg-gray-900 p-5 sm:p-6">
				<Show when={props.importAborted}>
					<p class="mb-4 text-sm text-yellow">Finishing cancellation and cleaning up…</p>
				</Show>
				<ImportProgress steps={props.steps} onStop={props.importAborted ? undefined : props.onStop} />
			</div>
		</Show>

		<Show when={props.showAbortMessage}>
			<div class="mb-8 rounded-lg border border-yellow/60 bg-yellow/10 p-4">
				<div class="flex items-start gap-3">
					<svg
						class="mt-0.5 h-5 w-5 shrink-0 text-yellow"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.75"
							d="M12 9v4m0 4h.01M10.3 4.8 2.9 18a2 2 0 0 0 1.75 3h14.7a2 2 0 0 0 1.75-3L13.7 4.8a2 2 0 0 0-3.4 0Z"
						/>
					</svg>
					<div>
						<h3 class="mb-1 text-base font-semibold text-yellow">Import Stopped</h3>
						<p class="text-sm text-yellow">
							The import process was cancelled. You can try again with your data files.
						</p>
					</div>
				</div>
			</div>
		</Show>

		<Show when={props.errorMessage}>
			<div class="mb-8 rounded-lg border border-red/60 bg-red/10 p-4" role="alert">
				<h3 class="mb-1 text-base font-semibold text-red">Couldn’t load the data</h3>
				<p class="text-sm text-red">{props.errorMessage}</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<Show when={props.demoMode}>
						<button
							type="button"
							class="inline-flex min-h-9 items-center justify-center rounded-lg border border-red/60 px-3 py-2 text-sm font-semibold text-gray-100 hover:bg-red/15"
							onClick={props.onRetryDemo}
						>
							Retry demo
						</button>
					</Show>
					<button
						type="button"
						class="inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-100 hover:bg-gray-800"
						onClick={props.onDismissError}
					>
						Dismiss
					</button>
				</div>
			</div>
		</Show>
	</>
);

export default ImportStatus;
