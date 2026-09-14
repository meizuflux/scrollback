import type { Component } from "solid-js";

interface DataReadyStateProps {
	demoMode: boolean;
	isClearing: boolean;
	onViewAnalysis: () => void;
	onTryDemo: () => void;
	onClearData: () => void;
}

const DataReadyState: Component<DataReadyStateProps> = (props) => (
	<div class="mb-8 rounded-lg border border-pink/35 bg-[radial-gradient(circle_at_88%_18%,rgba(121,115,245,0.2),transparent_16rem),linear-gradient(145deg,rgba(39,27,43,0.96),rgba(24,24,24,0.96))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.16)] sm:p-8">
		<div class="text-center">
			<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-purple text-purple shadow-[0_0_20px_rgba(120,115,245,0.15)]">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12 4 4L19 6" />
				</svg>
			</div>
			<h2 class="mb-3 font-sans text-2xl font-semibold text-white">
				{props.demoMode ? "Demo data ready" : "Data Ready"}
			</h2>
			<p class="mx-auto mb-6 max-w-md text-gray-400">
				{props.demoMode
					? "The sample Instagram archive is ready to explore."
					: "Your Instagram data has been successfully imported and is ready for analysis."}
			</p>
			<div class="flex flex-col justify-center gap-3 sm:flex-row">
				<button
					type="button"
					class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-pink bg-pink px-4 py-2.5 text-sm font-semibold leading-5 text-gray-950 shadow-[0_8px_24px_rgba(255,110,196,0.14)] transition-colors hover:border-[#ffb1df] hover:bg-[#ffb1df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
					onClick={props.onViewAnalysis}
				>
					View Analysis
				</button>
				<button
					type="button"
					class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-red-700 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-red-200 transition-colors hover:border-red-200 hover:bg-red-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 disabled:cursor-not-allowed disabled:opacity-50"
					onClick={props.onClearData}
					disabled={props.isClearing}
				>
					{props.isClearing ? (
						<div class="flex items-center justify-center gap-2">
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-gray-100"></div>
							Clearing...
						</div>
					) : (
						"Clear Data"
					)}
				</button>
			</div>
		</div>
	</div>
);

export default DataReadyState;
