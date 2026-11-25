import { runCheckout } from './checkout';
import { checkoutWorkflow } from './workflow';

const order = { sku: 'tee-black-m', quantity: 2, amount: 120, email: 'ada@example.com' };

for (const [name, amount] of [
	['a card that pays', 120],
	['a card that is declined', 900],
] as const) {
	console.log(name);
	const context = { stock: { 'tee-black-m': 10 }, cardLimit: 500, sent: [] };
	const checkout = await runCheckout(checkoutWorkflow({ ...order, amount }), context);
	if (!checkout.success) console.log(checkout.issues.join('\n'));
	else {
		for (const result of checkout.results) {
			const group = result.groupIndex === undefined ? '' : `, group ${result.groupIndex}`;
			const outcome = result.success ? result.message : result.error;
			console.log(`${result.actionId} (step ${result.sequenceIndex}${group}) ${result.status}: ${outcome}`);
		}
		console.log(`sent: ${context.sent.join(', ') || 'nothing'}`);
	}
}
