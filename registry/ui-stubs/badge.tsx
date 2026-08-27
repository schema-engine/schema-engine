import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function Badge({ children, ...props }: ComponentProps<'span'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <span {...rest}>{children}</span>;
}
