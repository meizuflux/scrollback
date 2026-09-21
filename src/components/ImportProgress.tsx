import { type Component, For, Show } from "solid-js";
import type { ImportStep } from "@/import/import";
import { Button } from "@/components/ui";

interface ImportProgressProps {
	steps: ImportStep[];
	onStop?: () => void;
}

const StepProgressBar: Component<{ step: ImportStep }> = (props) => {
	const currentProgress = () => props.step.progress || 0;

	return (
		<div class="flex items-center gap-3 rounded-lg border border-edge bg-panel p-4">
			<div class="min-w-0 flex-1">
				<div class="mb-1 flex items-center justify-between">
					<div class="truncate font-medium text-gray-100" title={props.step.name}>
						{props.step.name}
					</div>
					<span class="ml-2 shrink-0 font-mono text-sm text-gray-400">{currentProgress()}%</span>
				</div>

				<div class="mb-1 h-2 w-full rounded-full bg-gray-700">
					<div
						class="h-full rounded-full bg-purple transition-all duration-150 ease-linear"
						style={{ width: `${currentProgress()}%` }}
					/>
				</div>

				<Show when={props.step.statusText}>
					<div class="truncate text-xs text-gray-400" title={props.step.statusText}>
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
				<div class="mb-2 flex items-center justify-between">
					<h2 class="font-sans text-lg font-semibold tracking-tight text-gray-100">Importing data</h2>
					<div class="flex items-center gap-3">
						<Show when={totalSteps() > 0}>
							<span class="text-sm text-gray-400">
								{completedSteps()} / {totalSteps()} steps completed
							</span>
						</Show>
						<Show when={props.onStop}>
							<Button
								variant="secondary"
								size="sm"
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
							</Button>
						</Show>
					</div>
				</div>

				<div class="mb-2 h-3 w-full rounded-full border border-edge bg-gray-700">
					<div
						class="h-full rounded-full bg-purple transition-all duration-150 ease-linear"
						style={{ width: `${overallProgress()}%` }}
					/>
				</div>
				<div class="text-center">
					<span class="font-sans text-lg font-semibold text-purple-soft">{overallProgress()}%</span>
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
