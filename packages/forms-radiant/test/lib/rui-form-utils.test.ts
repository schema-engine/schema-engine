import { describe, expect, test, vi } from 'vitest';
import { submitNativeForm } from '@/lib/rui-form-utils';

describe('submitNativeForm', () => {
	test('uses requestSubmit so RuiForm can validate', () => {
		const requestSubmit = vi.fn();
		const dispatchEvent = vi.fn();

		submitNativeForm({ requestSubmit, dispatchEvent });

		expect(requestSubmit).toHaveBeenCalledOnce();
		expect(dispatchEvent).not.toHaveBeenCalled();
	});

	test('falls back to a submit event when requestSubmit is missing', () => {
		const dispatchEvent = vi.fn();

		submitNativeForm({ dispatchEvent } as { requestSubmit?: () => void; dispatchEvent: (event: Event) => boolean });

		expect(dispatchEvent).toHaveBeenCalledOnce();
		const event = dispatchEvent.mock.calls[0]?.[0] as Event;
		expect(event.type).toBe('submit');
	});
});
