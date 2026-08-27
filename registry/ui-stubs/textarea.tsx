import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function Textarea(props: ComponentProps<'textarea'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <textarea {...rest} />;
}
