import { type Component, Show } from "solid-js";
import ImportProgress from "@/components/ImportProgress";
import type { ImportStep } from "@/import/import";
import { Button, Panel } from "@/components/ui";

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
			<Panel class="mb-8 p-5 sm:p-6">
				<Show when={props.importAborted}>
					<p class="mb-4 text-sm text-orange-soft">Finishing cancellation and cleaning up…</p>
				</Show>
				<ImportProgress steps={props.steps} onStop={props.importAborted ? undefined : props.onStop} />
			</Panel>
		</Show>

		<Show when={props.showAbortMessage}>
			<div class="mb-8 rounded-lg border border-orange-line bg-orange-fill/60 p-4">
				<div class="flex items-start gap-3">
					<svg
						class="mt-0.5 h-5 w-5 shrink-0 text-orange-soft"
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
						<h3 class="mb-1 font-sans text-base font-semibold text-orange-soft">Import Stopped</h3>
						<p class="text-sm text-orange-soft">
							The import process was cancelled. You can try again with your data files.
						</p>
					</div>
				</div>
			</div>
		</Show>

		<Show when={props.errorMessage}>
			<div class="mb-8 rounded-lg border border-red-line bg-red-fill/60 p-4" role="alert">
				<h3 class="mb-1 font-sans text-base font-semibold text-red-soft">Couldn’t load the data</h3>
				<p class="text-sm text-red-soft">{props.errorMessage}</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<Show when={props.demoMode}>
						<Button variant="danger" size="sm" onClick={props.onRetryDemo}>
							Retry demo
						</Button>
					</Show>
					<Button variant="secondary" size="sm" onClick={props.onDismissError}>
						Dismiss
					</Button>
				</div>
			</div>
		</Show>
	</>
);

export default ImportStatus;
