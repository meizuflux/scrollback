/* @refresh reload */
import { render } from "solid-js/web";

import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./index.css";
import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { loadAnalysisPage } from "@/pages/analysisLoader";

const Home = lazy(() => import("@/pages/Home"));
const Analysis = lazy(loadAnalysisPage);
const ExportIndex = lazy(() => import("@/pages/export/index"));
const SqliteExport = lazy(() => import("@/pages/export/sqlite"));

const App = () => {
	return (
		<Router>
			<Route path="/" component={Home} />
			<Route path="/analysis" component={Analysis} />
			<Route path="/export" component={ExportIndex} />
			<Route path="/export/sqlite" component={SqliteExport} />
			<Route path="/*" component={() => <div>404 Not Found</div>} />
		</Router>
	);
};

render(() => <App />, document.getElementById("root")!);
