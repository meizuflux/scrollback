import { createSignal } from "solid-js";

const DEMO_MODE_KEY = "demo_mode";

const readDemoMode = (): boolean =>
	typeof sessionStorage !== "undefined" && sessionStorage.getItem(DEMO_MODE_KEY) === "true";

const [demoMode, setDemoModeSignal] = createSignal(readDemoMode());

export const isDemoMode = demoMode;

const updateDemoMode = (enabled: boolean): void => {
	if (typeof sessionStorage !== "undefined") {
		if (enabled) sessionStorage.setItem(DEMO_MODE_KEY, "true");
		else sessionStorage.removeItem(DEMO_MODE_KEY);
	}
	setDemoModeSignal(enabled);
};

export const enterDemoMode = (): void => updateDemoMode(true);

export const clearDemoMode = (): void => updateDemoMode(false);
