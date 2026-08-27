import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function Progress({
	value,
	...props
}: Omit<ComponentProps<'div'>, 'children'> & StubExtras & { value?: number }) {
	const { rest } = splitExtras(props);
	return <div role="progressbar" aria-valuenow={value} {...rest} />;
}
