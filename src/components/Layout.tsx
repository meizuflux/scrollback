import { type ParentComponent, createSignal, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { isDataLoaded } from "@/utils/storage";
import logo from "@/assets/logo.svg";

const Layout: ParentComponent = (props) => {
	const [dataLoaded, setDataLoaded] = createSignal(false);

	onMount(() => {
		const loaded = isDataLoaded();
		setDataLoaded(loaded);
	});

	return (
		<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
			<header class="bg-gray-800/80 backdrop-blur border-b border-gray-700">
				<div class="container mx-auto px-4 py-4">
					<nav class="flex items-center justify-between">
						<A href="/" class="flex items-center space-x-3 hover:opacity-80 transition-opacity">
							<img src={logo} alt="Scrollback Logo" class="w-8 h-8" />
							<span class="text-xl font-bold text-white">Scrollback</span>
						</A>

						<div class="flex items-center space-x-6">
							{dataLoaded() ? (
								<A
									href="/analysis"
									class="text-gray-300 hover:text-white transition-colors font-medium"
								>
									Analysis
								</A>
							) : (
								<span
									class="text-gray-500 cursor-not-allowed font-medium"
									title="Import data first to access analysis"
								>
									Analysis
								</span>
							)}
							{dataLoaded() ? (
								<A href="/export" class="text-gray-300 hover:text-white transition-colors font-medium">
									Export
								</A>
							) : (
								<span
									class="text-gray-500 cursor-not-allowed font-medium"
									title="Import data first to access export"
								>
									Export
								</span>
							)}
						</div>
					</nav>
				</div>
			</header>

			<main class="flex-1">{props.children}</main>

			<footer class="bg-gray-800/80 backdrop-blur border-t border-gray-700 py-6">
				<div class="container mx-auto px-4">
					<div class="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
						<div class="mb-4 md:mb-0">
							<p>© 2025 meizuflux</p>
						</div>
						<div>
							<a
								href="https://github.com/meizuflux/scrollback"
								target="_blank"
								rel="noopener noreferrer"
								class="text-gray-300 hover:text-white transition-colors font-medium flex items-center space-x-1"
							>
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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
