import { type ParentComponent, Show, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { clearData } from "@/utils/storage";
import { isDemoMode } from "@/utils/demo";
import { Button } from "@/components/ui";

const Layout: ParentComponent = (props) => {
	const navigate = useNavigate();
	const [isExitingDemo, setIsExitingDemo] = createSignal(false);

	const exitDemo = async () => {
		if (isExitingDemo()) return;
		setIsExitingDemo(true);
		try {
			await clearData();
			navigate("/", { replace: true });
		} finally {
			setIsExitingDemo(false);
		}
	};

	return (
		<div class="isolate flex min-h-screen flex-col overflow-hidden bg-page font-space-grotesk text-gray-100">
			<div
				aria-hidden="true"
				class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60rem_24rem_at_50%_-12rem,rgba(131,124,247,0.1),transparent),radial-gradient(40rem_20rem_at_88%_-8rem,rgba(255,95,179,0.06),transparent)]"
			/>

			<Show when={isDemoMode()}>
				<div class="border-b border-purple-line bg-purple-fill/70">
					<div class="container mx-auto flex items-center justify-between gap-4 px-4 py-2 text-sm">
						<span class="font-medium text-purple-soft">You’re viewing demo data</span>
						<Button
							variant="ghost"
							size="sm"
							class="rounded-lg"
							onClick={() => void exitDemo()}
							disabled={isExitingDemo()}
						>
							<Show when={isExitingDemo()} fallback="Exit demo">
								Exiting…
							</Show>
						</Button>
					</div>
				</div>
			</Show>

			<main class="flex-1">{props.children}</main>

			<footer class="mt-10 border-t border-edge bg-surface/60 py-6">
				<div class="container mx-auto px-4">
					<div class="flex flex-col items-center justify-between text-sm text-gray-400 md:flex-row">
						<div class="mb-4 md:mb-0">
							<p>© 2026 meizuflux</p>
						</div>
						<div>
							<a
								href="https://github.com/meizuflux/scrollback"
								target="_blank"
								rel="noopener noreferrer"
								class="flex cursor-pointer items-center gap-1 font-medium text-gray-400 transition-colors hover:text-gray-100"
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
								</svg>
								<span>GitHub</span>
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Layout;
