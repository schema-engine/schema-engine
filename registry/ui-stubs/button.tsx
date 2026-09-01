import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function buttonVariants(_options?: Record<string, unknown>) {
	return '';
}

export function Button({ children, ...props }: ComponentProps<'button'> & StubExtras) {
	const { extras, rest } = splitExtras(props);
	if (extras.render) return <>{extras.render(rest)}</>;
	return (
		<button type="button" {...rest}>
			{children}
		</button>
	);
}
