import type { ReactNode } from 'react';

type StubProps = Record<string, unknown> & { children?: ReactNode };

export function Switch(_props: StubProps) {
	return <button type="button" />;
}
