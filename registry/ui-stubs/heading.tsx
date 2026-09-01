import type { ComponentProps, ElementType } from 'react';
import { splitExtras, type StubExtras } from './props';

type AsProp = { as?: ElementType };

export function Heading({ children, as: Comp = 'header', ...props }: ComponentProps<'header'> & StubExtras & AsProp) {
	const { rest } = splitExtras(props);
	return <Comp {...rest}>{children}</Comp>;
}

export function HeadingTitle({ children, as: Comp = 'h2', ...props }: ComponentProps<'h2'> & AsProp) {
	return <Comp {...props}>{children}</Comp>;
}

export function HeadingDescription({ children, ...props }: ComponentProps<'p'>) {
	return <p {...props}>{children}</p>;
}

export function HeadingEyebrow({ children, ...props }: ComponentProps<'p'>) {
	return <p {...props}>{children}</p>;
}
