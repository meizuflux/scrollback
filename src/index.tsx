/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";

const Home = lazy(() => import("@/pages/Home"));
const Analysis = lazy(() => import("@/pages/Analysis"));
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