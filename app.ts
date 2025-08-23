import { EcopagesApp } from "@ecopages/core/adapters/bun/create-app";
import appConfig from "./eco.config";

const app = new EcopagesApp({ appConfig });

app.post("/api/submit-demo", async (ctx) => {
	const body = await ctx.request.json();
	console.log("Received data:", body);
	return ctx.response.json({ success: true });
});

await app.start();
