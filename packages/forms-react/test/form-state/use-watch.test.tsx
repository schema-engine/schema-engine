import { describe, expect, test } from 'vitest';
import { act, render } from '@testing-library/react';
import { useWatch } from '@/hooks/form-state';
import { ContainerHarness, createTestContainer } from '../utils/container-harness';

describe('watching values', () => {
	function mount() {
		const seen: { one?: unknown; many?: readonly unknown[]; form?: unknown; manyRenders: number } = {
			manyRenders: 0,
		};
		const container = createTestContainer({ defaults: { a: 'x', b: 'y', c: 'z' } });
		function Reader() {
			seen.one = useWatch('a');
			seen.many = useWatch(['a', 'b']);
			seen.form = useWatch();
			seen.manyRenders += 1;
			return null;
		}
		render(
			<ContainerHarness container={container}>
				<Reader />
			</ContainerHarness>,
		);
		return { container, seen };
	}

	test('a path, a list of paths in order and the whole tree follow the container', () => {
		const { container, seen } = mount();
		expect(seen.one).toBe('x');
		expect(seen.many).toEqual(['x', 'y']);

		act(() => container.setValue('b', 'changed'));

		expect(seen.many).toEqual(['x', 'changed']);
		expect(seen.form).toEqual({ a: 'x', b: 'changed', c: 'z' });
	});

	test('a list keeps its identity while none of its values changed', () => {
		const { container, seen } = mount();
		const list = seen.many;

		act(() => container.setValue('c', 'other'));

		expect(seen.many).toBe(list);
	});
});
