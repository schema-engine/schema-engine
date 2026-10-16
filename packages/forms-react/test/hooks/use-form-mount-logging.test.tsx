import { afterEach, expect, test, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFormMountEffect } from '@/adapters/rhf/hooks/use-form-mount-effect';

afterEach(() => {
	vi.restoreAllMocks();
});

test('tags failed mount actions with the React package while preserving the error', async () => {
	const output = vi.spyOn(console, 'error').mockImplementation(() => {});
	const failure = new Error('Mount action rejected');
	renderHook(() =>
		useFormMountEffect({
			actions: [{ id: 'mount', $type: 'submit', triggers: ['form_mount'] }],
			dispatchTrigger: async () => {
				throw failure;
			},
		}),
	);

	await waitFor(() => {
		const message = output.mock.calls.flat().join(' ');
		expect(message).toContain('[schema-engine/forms-react]');
		expect(message).toContain('Form mount action execution failed:');
		expect(message).toContain(failure.stack);
	});
});
