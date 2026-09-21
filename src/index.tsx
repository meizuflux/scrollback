/* @refresh reload */
import { render } from "solid-js/web";

import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./index.css";
import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { loadAnalysisPage } from "@/pages/analysisLoader";
import HighlightsPage from "@/pages/analysis/HighlightsPage";
import PeoplePage from "@/pages/analysis/PeoplePage";
import ConversationsPage from "@/pages/analysis/ConversationsPage";
import ProfilePage from "@/pages/analysis/ProfilePage";

const Home = lazy(() => import("@/pages/Home"));
const AnalysisLayout = lazy(loadAnalysisPage);
const ExportIndex = lazy(() => import("@/pages/export/index"));
const SqliteExport = lazy(() => import("@/pages/export/sqlite"));

const App = () => {
	return (
		<Router>
			<Route path="/" component={Home} />
			<Route path="/analysis" component={AnalysisLayout}>
				<Route path="/" component={HighlightsPage} />
				<Route path="/people" component={PeoplePage} />
				<Route path="/conversations" component={ConversationsPage} />
				<Route path="/profile" component={ProfilePage} />
			</Route>
			<Route path="/export" component={ExportIndex} />
			<Route path="/export/sqlite" component={SqliteExport} />
			<Route path="/*" component={() => <div>404 Not Found</div>} />
		</Router>
	);
};

render(() => <App />, document.getElementById("root")!);
