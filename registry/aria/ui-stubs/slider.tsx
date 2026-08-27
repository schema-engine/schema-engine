import type { ReactNode } from 'react';

type StubProps = Record<string, unknown> & { children?: ReactNode };

export function Slider(_props: StubProps) {
	return <div />;
}
