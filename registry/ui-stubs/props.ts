import type { ReactNode } from 'react';

/**
 * Presentational props the three bases pass to their shadcn components. They
 * carry no meaning for a stub, but must be accepted and kept off the DOM.
 */
export interface StubExtras {
	variant?: string;
	size?: string;
	orientation?: string;
	align?: string;
	asChild?: boolean;
	render?: (props: Record<string, unknown>) => ReactNode;
}

const EXTRA_KEYS: Array<keyof StubExtras> = ['variant', 'size', 'orientation', 'align', 'asChild', 'render'];

/** Splits presentational props off so the rest can be spread onto a DOM node. */
export function splitExtras<T extends StubExtras>(props: T): { extras: StubExtras; rest: Omit<T, keyof StubExtras> } {
	const extras: StubExtras = {};
	const rest = { ...props } as Record<string, unknown>;

	for (const key of EXTRA_KEYS) {
		if (key in rest) {
			extras[key] = rest[key] as never;
			delete rest[key];
		}
	}

	return { extras, rest: rest as Omit<T, keyof StubExtras> };
}
