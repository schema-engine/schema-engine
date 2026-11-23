/**
 * What the server runs on each moment of the cart page.
 *
 * @remarks
 * `track-cart` answers `change` and everything else answers `submit`, through each entry's own `triggers`.
 */
const cartWorkflow = [
	{ id: 'track-cart', $type: 'trackPurchase', event: 'cart_changed', triggers: ['change'] },
	{ id: 'reserve', $type: 'reserveStock', sku: 'tee-black-m', quantity: 2, triggers: ['submit'] },
	[
		{ id: 'charge', $type: 'chargeCard', amount: 120, triggers: ['submit'] },
		{ id: 'warehouse', $type: 'notifyWarehouse', triggers: ['submit'] },
		{ id: 'track', $type: 'trackPurchase', event: 'purchase', triggers: ['submit'] },
	],
	{ id: 'receipt', $type: 'sendReceipt', to: 'ada@example.com', triggers: ['submit'] },
];

/**
 * The workflow of the next release, which a client that has not updated cannot run: it fraud-checks the order
 * with an action the client does not have, and sends a quantity as text.
 */
const nextWorkflow = [
	{ id: 'score', $type: 'scoreRisk', threshold: 0.8, triggers: ['submit'] },
	{ id: 'reserve', $type: 'reserveStock', sku: 'tee-black-m', quantity: '2', triggers: ['submit'] },
];

/** The route handler of `/cart/workflow`: it answers with the workflow as JSON. `?next` asks for the next release's. */
export function GET(request: Request): Response {
	return Response.json(new URL(request.url).searchParams.has('next') ? nextWorkflow : cartWorkflow);
}
