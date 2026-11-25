import { afterEach, describe, expect, test } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import type { FormConfig, FormRuntime, FormWizard } from '@schema-engine/forms';
import { useFormRuntime, useFormWizard } from '../../src/hooks/use-form-context';
import { renderProvider } from '../utils/form-harness';

afterEach(cleanup);

const config: FormConfig = {
	id: 'wizard',
	steps: [
		{ id: 'a', title: 'A', elements: [{ $type: 'input', id: 'title', name: 'title' }] },
		{ id: 'b', title: 'B', elements: [] },
	],
};

const single: FormConfig = {
	id: 'single',
	steps: [{ id: 'a', title: 'A', elements: [{ $type: 'input', id: 'title', name: 'title' }] }],
};

function mount(form: FormConfig = config) {
	const seen: FormWizard[] = [];
	let runtime!: FormRuntime;
	function Reader() {
		seen.push(useFormWizard());
		runtime = useFormRuntime();
		return null;
	}
	renderProvider(form, <Reader />);
	return { seen, runtime: () => runtime };
}

describe('useFormWizard', () => {
	test('keeps its identity while the user types and while the submission changes', async () => {
		const { seen, runtime } = mount(single);
		const first = seen.at(-1);

		act(() => runtime().container.setValue('title', 'typed'));
		await act(() => runtime().submit());
		act(() => runtime().clearSubmission());

		expect(seen.at(-1)).toBe(first);
	});

	test('changes when the step moves', async () => {
		const { seen, runtime } = mount();
		const first = seen.at(-1);
		expect(first?.current).toBe('a');

		await act(() => runtime().next());

		expect(seen.at(-1)).not.toBe(first);
		expect(seen.at(-1)?.current).toBe('b');
	});

	test('hands over the commands of the runtime itself', () => {
		const { seen, runtime } = mount();
		const wizard = seen.at(-1);

		expect(wizard?.next).toBe(runtime().next);
		expect(wizard?.back).toBe(runtime().back);
		expect(wizard?.goTo).toBe(runtime().goTo);
	});
});
