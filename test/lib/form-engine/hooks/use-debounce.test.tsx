import { test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { useDebounce, useDebouncedValue } from '../../../../src/lib/form-engine/hooks/use-debounce';


function TestComponent({ delay = 500 }: { delay?: number }) {
	const [value, setValue] = useState('');
	const [counter, setCounter] = useState(0);
	
	const debouncedValue = useDebouncedValue(value, delay);
	const debouncedCallback = useDebounce(() => {
		setCounter(prev => prev + 1);
	}, delay);

	return (
		<div>
			<input
				data-testid="input"
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>
			<div data-testid="original-value">{value}</div>
			<div data-testid="debounced-value">{debouncedValue}</div>
			<button data-testid="callback-button" onClick={debouncedCallback}>
				Click me
			</button>
			<div data-testid="counter">{counter}</div>
		</div>
	);
}

test('useDebouncedValue should debounce value updates', async () => {
	render(<TestComponent delay={300} />);
	
	const input = screen.getByTestId('input');
	const originalValue = screen.getByTestId('original-value');
	const debouncedValue = screen.getByTestId('debounced-value');

	expect(originalValue.textContent).toBe('');
	expect(debouncedValue.textContent).toBe('');

	fireEvent.change(input, { target: { value: 'h' } });
	fireEvent.change(input, { target: { value: 'he' } });
	fireEvent.change(input, { target: { value: 'hel' } });
	fireEvent.change(input, { target: { value: 'hello' } });

	expect(originalValue.textContent).toBe('hello');
	expect(debouncedValue.textContent).toBe('');

	await waitFor(() => {
		expect(debouncedValue.textContent).toBe('hello');
	}, { timeout: 500 });
});

test('useDebounce should debounce function calls', async () => {
	render(<TestComponent delay={200} />);
	
	const button = screen.getByTestId('callback-button');
	const counter = screen.getByTestId('counter');

	expect(counter.textContent).toBe('0');

	fireEvent.click(button);
	fireEvent.click(button);
	fireEvent.click(button);
	fireEvent.click(button);
	fireEvent.click(button);

	expect(counter.textContent).toBe('0');

	await waitFor(() => {
		expect(counter.textContent).toBe('1');
	}, { timeout: 400 });

	fireEvent.click(button);
	
	await waitFor(() => {
		expect(counter.textContent).toBe('2');
	}, { timeout: 400 });
});

test('useDebouncedValue should handle zero delay', async () => {
	render(<TestComponent delay={0} />);
	
	const input = screen.getByTestId('input');
	const originalValue = screen.getByTestId('original-value');
	const debouncedValue = screen.getByTestId('debounced-value');

	fireEvent.change(input, { target: { value: 'immediate' } });

	expect(originalValue.textContent).toBe('immediate');
	
	/**
	 * With zero delay, the debounced value should update immediately.
	 * However, since state updates are asynchronous, we still need to wait for the next tick.
	 */
	await waitFor(() => {
		expect(debouncedValue.textContent).toBe('immediate');
	}, { timeout: 100 });
});

test('useDebouncedValue should reset timer on rapid changes', async () => {
	render(<TestComponent delay={300} />);
	
	const input = screen.getByTestId('input');
	const debouncedValue = screen.getByTestId('debounced-value');

	fireEvent.change(input, { target: { value: 'test' } });
	
	await new Promise(resolve => setTimeout(resolve, 200));
	
	fireEvent.change(input, { target: { value: 'testing' } });
	
	expect(debouncedValue.textContent).toBe('');
	
	await waitFor(() => {
		expect(debouncedValue.textContent).toBe('testing');
	}, { timeout: 500 });
});
