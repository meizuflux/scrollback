/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import { Router, Route, RouteSectionProps } from "@solidjs/router";
import { JSX, lazy } from "solid-js";

const Home = lazy(() => import("./pages/Home"));
const Analysis = lazy(() => import("./pages/Analysis"));

const Layout = (props: RouteSectionProps): JSX.Element => {
	return (
		<>
			<h1 class="text-3xl font-bold underline">welcome</h1>
			{props.children}
		</>
	);
};

const App = () => {
	const loaded = localStorage.getItem("loaded");

	if (loaded === "true") {
		const user = JSON.parse(localStorage.getItem("user")!);
		const pfp = localStorage.getItem("pfp")!;

		return <Analysis user={user} pfp={pfp} />;
	} else {
		return <Home />;
	}
};

render(App, document.getElementById("root")!);
