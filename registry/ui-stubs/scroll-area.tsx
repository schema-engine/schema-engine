import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function ScrollArea({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <div {...rest}>{children}</div>;
}
