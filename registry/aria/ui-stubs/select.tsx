import type { ReactNode } from 'react';

type StubProps = Record<string, unknown> & { children?: ReactNode };

export function Select({ children }: StubProps) {
	return <div>{children}</div>;
}

export function SelectTrigger({ children }: StubProps) {
	return <button type="button">{children}</button>;
}

export function SelectValue(_props: StubProps) {
	return <span />;
}

export function SelectContent({ children }: StubProps) {
	return <div>{children}</div>;
}

export function SelectItem({ children }: StubProps) {
	return <div>{children}</div>;
}
