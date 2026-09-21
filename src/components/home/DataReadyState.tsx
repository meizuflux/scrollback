import { type Component, Show } from "solid-js";
import { Button, Panel } from "@/components/ui";

interface DataReadyStateProps {
	demoMode: boolean;
	isClearing: boolean;
	onViewAnalysis: () => void;
	onTryDemo: () => void;
	onClearData: () => void;
}

const DataReadyState: Component<DataReadyStateProps> = (props) => (
	<Panel variant="raised" class="mb-8 p-6 text-center sm:p-8">
		<div class="text-center">
			<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-purple-line text-purple-soft">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12 4 4L19 6" />
				</svg>
			</div>
			<h2 class="mb-3 font-sans text-2xl font-semibold tracking-tight text-gray-100">
				<Show when={props.demoMode} fallback="Data Ready">
					Demo data ready
				</Show>
			</h2>
			<p class="mx-auto mb-6 max-w-md text-gray-400">
				<Show
					when={props.demoMode}
					fallback="Your Instagram data has been successfully imported and is ready for analysis."
				>
					The sample Instagram archive is ready to explore.
				</Show>
			</p>
			<div class="flex flex-col justify-center gap-3 sm:flex-row">
				<Button variant="primary" onClick={props.onViewAnalysis}>
					View Analysis
				</Button>
				<Button variant="danger" onClick={props.onClearData} disabled={props.isClearing}>
					<Show when={props.isClearing} fallback="Clear Data">
						<div class="flex items-center justify-center gap-2">
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-gray-100"></div>
							Clearing...
						</div>
					</Show>
				</Button>
			</div>
		</div>
	</Panel>
);

export default DataReadyState;
