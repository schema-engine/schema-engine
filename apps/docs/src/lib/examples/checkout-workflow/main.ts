import { runCheckout } from './checkout';
import { checkoutWorkflow } from './workflow';

/** `cause` holds the error a handler threw, which has no JSON form. */
const withoutCause = (key: string, value: unknown) => (key === 'cause' ? undefined : value);

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
		for (const result of checkout.results) console.log(JSON.stringify(result, withoutCause));
		console.log(`sent: ${context.sent.join(', ') || 'nothing'}`);
	}
}
