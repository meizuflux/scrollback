import { Component, For, Show } from "solid-js";
import { ImportStep } from "../import/import";

interface ImportProgressProps {
	steps: ImportStep[];
}

const StepProgressBar: Component<{ step: ImportStep }> = (props) => {
	const currentProgress = () => props.step.progress || 0;

	return (
		<div class="flex items-center gap-3 p-4 bg-gray-700 rounded-lg border border-gray-600">
			<div class="flex-1 min-w-0">
				<div class="flex justify-between items-center mb-1">
					<div class="font-medium text-white truncate" title={props.step.name}>
						{props.step.name}
					</div>
					<span class="text-sm text-gray-400 flex-shrink-0 ml-2">{currentProgress()}%</span>
				</div>

				<div class="w-full bg-gray-600 rounded-full h-2 mb-1">
					<div
						class="bg-blue-500 h-full rounded-full transition-all duration-150 ease-linear"
						style={{ width: `${currentProgress()}%` }}
					/>
				</div>

				<Show when={props.step.statusText}>
					<div class="text-xs text-gray-400 truncate" title={props.step.statusText}>
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
		<div class="space-y-4">
			<div class="mb-6">
				<div class="flex justify-between items-center mb-2">
					<h2 class="text-xl font-semibold text-white">Importing Data...</h2>
					<Show when={totalSteps() > 0}>
						<span class="text-sm text-gray-300">
							{completedSteps()} / {totalSteps()} steps completed
						</span>
					</Show>
				</div>

				<div class="w-full bg-gray-700 rounded-full h-3 border border-gray-600 mb-2">
					<div
						class="bg-blue-500 h-full rounded-full transition-all duration-150 ease-linear"
						style={{ width: `${overallProgress()}%` }}
					/>
				</div>
				<div class="text-center">
					<span class="text-lg font-medium text-blue-400">{overallProgress()}%</span>
				</div>
			</div>

			<div class="space-y-3">
				<For each={props.steps} fallback={<p class="text-white text-center">Loading...</p>}>
					{(step) => <StepProgressBar step={step} />}
				</For>
			</div>
		</div>
	);
};

export default ImportProgress;
