import type { ReactNode } from 'react';

type StubProps = Record<string, unknown> & { children?: ReactNode };

export function RadioGroup({ children }: StubProps) {
	return <div>{children}</div>;
}

export function RadioGroupItem(_props: StubProps) {
	return <button type="button" />;
}
