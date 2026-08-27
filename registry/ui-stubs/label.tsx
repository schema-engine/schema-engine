import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function Label(props: ComponentProps<'label'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <label {...rest} />;
}
