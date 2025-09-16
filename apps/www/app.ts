import { EcopagesApp } from "@ecopages/core/adapters/bun/create-app";
import appConfig from "./eco.config";
import { Logger } from "@ecopages/logger";

const appLogger = new Logger("[form-engine-app]",{
	debug: import.meta.env.ECOPAGES_LOGGER_DEBUG === "true",
});

const app = new EcopagesApp({ appConfig });

app.post("/api/submit-demo", async (ctx) => {
	const body = await ctx.request.json();
	appLogger.debug("Received data:", body);
	return ctx.response.json({ success: true });
});

await app.start();
