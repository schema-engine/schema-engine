export interface Order {
	sku: string;
	quantity: number;
	amount: number;
	email: string;
}

/**
 * The checkout of an order as JSON text, the way a server or a CMS would send it.
 *
 * @remarks
 * Stock is reserved first. Then the card is charged while the warehouse is told and the purchase is tracked: the
 * inner array is a group, which runs together. The receipt goes out last.
 */
export function checkoutWorkflow({ sku, quantity, amount, email }: Order): string {
	return JSON.stringify(
		[
			{ id: 'reserve', $type: 'reserveStock', sku, quantity },
			[
				{ id: 'charge', $type: 'chargeCard', amount },
				{ id: 'warehouse', $type: 'notifyWarehouse' },
				{ id: 'track', $type: 'trackPurchase', event: 'purchase' },
			],
			{ id: 'receipt', $type: 'sendReceipt', to: email },
		],
		null,
		'\t',
	);
}
