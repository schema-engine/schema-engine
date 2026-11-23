import type { CheckoutContext } from './actions';
import { loadWorkflow, runWorkflow } from './client';
import { GET } from './endpoint';

/** The client talking to the route handler, without a network. */
const server: typeof fetch = async (url, init) => GET(new Request(url, init));

const context: CheckoutContext = { stock: { 'tee-black-m': 10 }, cardLimit: 500, sent: [] };

const workflow = await loadWorkflow('https://shop.example/cart/workflow', server);
if (workflow.success) {
	for (const trigger of ['change', 'submit'] as const) {
		console.log(trigger);
		for (const { actionId, status, message } of await runWorkflow(workflow.actions, trigger, context)) {
			console.log(`  ${actionId}: ${status}, ${message}`);
		}
	}
}

const next = await loadWorkflow('https://shop.example/cart/workflow?next', server);
if (!next.success) {
	console.log('next release');
	for (const issue of next.issues) console.log(`  ${issue}`);
}
