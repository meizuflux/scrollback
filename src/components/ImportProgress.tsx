import { type Component, For, Show } from "solid-js";
import type { ImportStep } from "@/import/import";

interface ImportProgressProps {
	steps: ImportStep[];
	onStop?: () => void;
}

const StepProgressBar: Component<{ step: ImportStep }> = (props) => {
	const currentProgress = () => props.step.progress || 0;

	return (
		<div class="app-panel-muted flex items-center gap-3 p-4">
			<div class="flex-1 min-w-0">
				<div class="flex justify-between items-center mb-1">
					<div class="truncate font-medium text-[#F2F2F2]" title={props.step.name}>
						{props.step.name}
					</div>
					<span class="ml-2 shrink-0 text-sm text-[#A3A3A3]">{currentProgress()}%</span>
				</div>

				<div class="app-progress-track mb-1 h-2 w-full">
					<div
						class="app-progress-fill h-full transition-all duration-150 ease-linear"
						style={{ width: `${currentProgress()}%` }}
					/>
				</div>

				<Show when={props.step.statusText}>
					<div class="truncate text-xs text-[#737373]" title={props.step.statusText}>
						{props.step.statusText}
					</div>
				</Show>
			</div>
		</div>
	);
};

const ImportProgress: Component<ImportProgressProps> = (props) => {
	const completedSteps = () => props.steps.filter((s) => s.progress === 100).length;
	const totalSteps = () => props.steps.length;
	const overallProgress = () => {
		const total = totalSteps();
		return total > 0 ? Math.round((completedSteps() / total) * 100) : 0;
	};

	return (
		<div class="space-y-4" aria-live="polite">
			<div class="mb-6">
				<div class="flex justify-between items-center mb-2">
					<h2 class="text-lg font-semibold text-[#F2F2F2]">Importing data</h2>
					<div class="flex items-center gap-3">
						<Show when={totalSteps() > 0}>
							<span class="text-sm text-[#A3A3A3]">
								{completedSteps()} / {totalSteps()} steps completed
							</span>
						</Show>
						<Show when={props.onStop}>
							<button
								type="button"
								class="app-button-secondary"
								onClick={() => {
									if (
										confirm(
											"Are you sure you want to stop the import process? This will lose all progress.",
										)
									) {
										props.onStop!();
									}
								}}
								title="Stop import process"
							>
								Cancel
							</button>
						</Show>
					</div>
				</div>

				<div class="app-progress-track mb-2 h-3 w-full border border-[#303030]">
					<div
						class="app-progress-fill h-full transition-all duration-150 ease-linear"
						style={{ width: `${overallProgress()}%` }}
					/>
				</div>
				<div class="text-center">
					<span class="text-lg font-medium text-[#4A99F8]">{overallProgress()}%</span>
				</div>
			</div>

			<div class="space-y-3">
				<For each={props.steps} fallback={<p class="text-center text-[#A3A3A3]">Loading...</p>}>
					{(step) => <StepProgressBar step={step} />}
				</For>
			</div>
		</div>
	);
};

export default ImportProgress;
