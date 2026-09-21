import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { constants } from "node:fs";

declare const Bun: {
	file(path: string): Blob;
	serve(options: { hostname: string; port: number; fetch(request: Request): Response }): { port: number };
};

const [input, portText] = process.argv.slice(2);
if (!input) {
	console.error("Usage: bun run instagram:preview <report.html> [port]");
	process.exit(1);
}

const report = resolve(input);
const inventory = resolve(dirname(report), "inventory.json");
try {
	await access(report, constants.R_OK);
	await access(inventory, constants.R_OK);
} catch {
	console.error("report.html or inventory.json does not exist or cannot be read beside: " + report);
	process.exit(1);
}

const port = portText ? Number(portText) : 3000;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
	console.error("Port must be an integer between 1 and 65535.");
	process.exit(1);
}

const server = Bun.serve({
	hostname: "127.0.0.1",
	port,
	fetch(request: Request) {
		const url = new URL(request.url);
		if (url.pathname !== "/" && url.pathname !== "/report.html") {
			return new Response("Not found", { status: 404 });
		}
		return new Response(Bun.file(report), {
			headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
		});
	},
});

console.log("Preview available at http://127.0.0.1:" + server.port + "/");
