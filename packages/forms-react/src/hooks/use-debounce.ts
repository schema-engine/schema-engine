import { useEffect, useRef, useState } from 'react';

/**
 * A hook that debounces function calls
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the callback
 */
export function useDebounce<T extends (...args: any[]) => void>(
	callback: T,
	delay: number,
): (...args: Parameters<T>) => void {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return (...args: Parameters<T>) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			callbackRef.current(...args);
		}, delay);
	};
}

/**
 * A hook that debounces a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => clearTimeout(timeoutId);
	}, [value, delay]);

	return debouncedValue;
}
