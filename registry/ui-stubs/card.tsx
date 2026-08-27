import type { ComponentProps } from 'react';
import { splitExtras, type StubExtras } from './props';

function Section({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <div {...rest}>{children}</div>;
}

export const Card = Section;
export const CardHeader = Section;
export const CardTitle = Section;
export const CardDescription = Section;
export const CardContent = Section;
export const CardFooter = Section;
export const CardAction = Section;
