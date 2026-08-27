import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

export function Alert({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return (
		<div role="alert" {...rest}>
			{children}
		</div>
	);
}

export function AlertTitle({ children, ...props }: ComponentProps<'div'>) {
	return <div {...props}>{children}</div>;
}

export function AlertDescription({ children, ...props }: ComponentProps<'div'>) {
	return <div {...props}>{children}</div>;
}
