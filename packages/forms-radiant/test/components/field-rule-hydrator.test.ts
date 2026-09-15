import { afterEach, describe, expect, it, vi } from 'vitest';

const isServerState = vi.hoisted(() => ({ value: false }));

vi.mock('@ecopages/radiant/is-server', () => ({
	get isServer() {
		return isServerState.value;
	},
}));

describe('ensureDocumentFieldRuleHydrator', () => {
	afterEach(() => {
		isServerState.value = false;
		vi.resetModules();
	});

	it('does not register listeners during SSR', async () => {
		isServerState.value = true;
		const { ensureDocumentFieldRuleHydrator } = await import('@/components/internals/field-rule-hydrator');

		const addEventListener = vi.fn();
		const doc = { addEventListener } as unknown as Document;

		ensureDocumentFieldRuleHydrator(doc);

		expect(addEventListener).not.toHaveBeenCalled();
	});

	it('registers at most one eco:after-swap listener per document', async () => {
		const { ensureDocumentFieldRuleHydrator } = await import('@/components/internals/field-rule-hydrator');

		const addEventListener = vi.fn();
		const doc = { addEventListener, querySelectorAll: () => [] } as unknown as Document;

		ensureDocumentFieldRuleHydrator(doc);
		ensureDocumentFieldRuleHydrator(doc);

		expect(addEventListener).toHaveBeenCalledTimes(1);
		expect(addEventListener).toHaveBeenCalledWith('eco:after-swap', expect.any(Function));
	});
});
