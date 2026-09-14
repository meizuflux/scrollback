import { type Component, For, Show } from "solid-js";
import type { ImportStep } from "@/import/import";

interface ImportProgressProps {
	steps: ImportStep[];
	onStop?: () => void;
}

const StepProgressBar: Component<{ step: ImportStep }> = (props) => {
	const currentProgress = () => props.step.progress || 0;

	return (
		<div class="flex items-center gap-3 rounded-lg border border-purple/30 bg-gray-900/85 p-4">
			<div class="flex-1 min-w-0">
				<div class="flex justify-between items-center mb-1">
					<div class="truncate font-medium text-gray-100" title={props.step.name}>
						{props.step.name}
					</div>
					<span class="ml-2 shrink-0 text-sm text-gray-400">{currentProgress()}%</span>
				</div>

				<div class="mb-1 h-2 w-full rounded-full bg-gray-700">
					<div
						class="h-full rounded-full bg-gradient-to-r from-pink to-purple transition-all duration-150 ease-linear"
						style={{ width: `${currentProgress()}%` }}
					/>
				</div>

				<Show when={props.step.statusText}>
					<div class="truncate text-xs text-gray-500" title={props.step.statusText}>
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
					<h2 class="font-sans text-lg font-semibold text-white">Importing data</h2>
					<div class="flex items-center gap-3">
						<Show when={totalSteps() > 0}>
							<span class="text-sm text-gray-400">
								{completedSteps()} / {totalSteps()} steps completed
							</span>
						</Show>
						<Show when={props.onStop}>
							<button
								type="button"
								class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-semibold leading-5 text-gray-100 transition-colors hover:border-purple hover:bg-purple/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
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

				<div class="mb-2 h-3 w-full rounded-full border border-gray-700 bg-gray-700">
					<div
						class="h-full rounded-full bg-gradient-to-r from-pink to-purple transition-all duration-150 ease-linear"
						style={{ width: `${overallProgress()}%` }}
					/>
				</div>
				<div class="text-center">
					<span class="bg-gradient-to-r from-pink to-purple bg-clip-text text-lg font-medium text-transparent">
						{overallProgress()}%
					</span>
				</div>
			</div>

			<div class="space-y-3">
				<For each={props.steps} fallback={<p class="text-center text-gray-400">Loading...</p>}>
					{(step) => <StepProgressBar step={step} />}
				</For>
			</div>
		</div>
	);
};

export default ImportProgress;
