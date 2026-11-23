export interface Order {
	number: number;
	paid: boolean;
	trackingUrl?: string;
}

/**
 * The document of an order page, as the server builds it.
 *
 * @remarks
 * This server is newer than the client in the recipe: it sends a `warning` tone and a `countdown` component the
 * client has not registered yet.
 */
export function orderDocument(order: Order): unknown[] {
	return [
		{
			$type: 'callout',
			tone: 'success',
			title: `Order ${order.number} confirmed`,
			text: 'Thanks for shopping with us.',
		},
		{ $type: 'badge', label: order.paid ? 'Paid' : 'Payment due', tone: order.paid ? 'success' : 'warning' },
		{ $type: 'countdown', until: '2026-12-24T00:00:00Z' },
		...(order.trackingUrl === undefined
			? []
			: [{ $type: 'button', label: 'Track parcel', href: order.trackingUrl }]),
	];
}

const orders = new Map<number, Order>([
	[1042, { number: 1042, paid: false, trackingUrl: '/parcels/1042' }],
	[1043, { number: 1043, paid: true }],
]);

/** The route handler of `/orders/:number`: it answers with the order's document as JSON, or 404. */
export function GET(request: Request): Response {
	const order = orders.get(Number(new URL(request.url).pathname.split('/').at(-1)));
	return order ? Response.json(orderDocument(order)) : new Response('Not found', { status: 404 });
}
