import { createSignal } from "solid-js";

const DEMO_MODE_KEY = "demo_mode";

const readDemoMode = (): boolean =>
	typeof sessionStorage !== "undefined" && sessionStorage.getItem(DEMO_MODE_KEY) === "true";

const [demoMode, setDemoModeSignal] = createSignal(readDemoMode());

export const isDemoMode = demoMode;

export const setDemoMode = (enabled: boolean): void => {
	if (typeof sessionStorage !== "undefined") {
		if (enabled) sessionStorage.setItem(DEMO_MODE_KEY, "true");
		else sessionStorage.removeItem(DEMO_MODE_KEY);
	}
	setDemoModeSignal(enabled);
};

export const clearDemoMode = (): void => setDemoMode(false);
