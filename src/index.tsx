/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";

const Home = lazy(() => import("./pages/Home"));
const Analysis = lazy(() => import("./pages/Analysis"));
const Export = lazy(() => import("./pages/Export"));

const App = () => {
	return (
		<Router>
			<Route path="/" component={Home} />
			<Route path="/analysis" component={Analysis} />
			<Route path="/export" component={Export} />
			<Route path="/*" component={() => <div>404 Not Found</div>} />
		</Router>
	);
};

render(() => <App />, document.getElementById("root")!);
