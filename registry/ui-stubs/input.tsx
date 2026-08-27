import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function Input(props: ComponentProps<'input'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <input {...rest} />;
}
