import type { Component } from "solid-js";

interface DataReadyStateProps {
	demoMode: boolean;
	isClearing: boolean;
	onViewAnalysis: () => void;
	onTryDemo: () => void;
	onClearData: () => void;
}

const DataReadyState: Component<DataReadyStateProps> = (props) => (
	<div class="mb-8 rounded-lg border border-[#303030] bg-[#181818] p-6 sm:p-8">
		<div class="text-center">
			<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#7873F5]">
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12 4 4L19 6" />
				</svg>
			</div>
			<h2 class="mb-3 text-2xl font-semibold text-[#F2F2F2]">
				{props.demoMode ? "Demo data ready" : "Data Ready"}
			</h2>
			<p class="mx-auto mb-6 max-w-md text-[#A3A3A3]">
				{props.demoMode
					? "The sample Instagram archive is ready to explore."
					: "Your Instagram data has been successfully imported and is ready for analysis."}
			</p>
			<div class="flex flex-col justify-center gap-3 sm:flex-row">
				<button
					type="button"
					class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#F2F2F2] bg-[#F2F2F2] px-4 py-2.5 text-sm font-semibold leading-5 text-[#101010] transition-colors hover:border-white hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5]"
					onClick={props.onViewAnalysis}
				>
					View Analysis
				</button>
				<button
					type="button"
					class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#404040] bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-[#F2F2F2] transition-colors hover:border-[#606060] hover:bg-[#202020] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7873F5] disabled:cursor-not-allowed disabled:opacity-50"
					onClick={props.onClearData}
					disabled={props.isClearing}
				>
					{props.isClearing ? (
						<div class="flex items-center justify-center gap-2">
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-[#737373] border-t-[#F2F2F2]"></div>
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
