import type { ComponentProps, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { splitExtras, type StubExtras } from './props';

const PopoverContext = createContext<{ open: boolean }>({ open: false });

export function Popover({
	open = false,
	modal: _modal,
	onOpenChange: _onOpenChange,
	children,
}: {
	open?: boolean;
	modal?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: ReactNode;
}) {
	return <PopoverContext.Provider value={{ open }}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ children, ...props }: ComponentProps<'button'> & StubExtras) {
	const { extras, rest } = splitExtras(props);
	if (extras.render) return <>{extras.render(rest)}</>;
	return (
		<button type="button" {...rest}>
			{children}
		</button>
	);
}

export function PopoverContent({
	children,
	align: _align,
	side: _side,
	sideOffset: _sideOffset,
	...props
}: ComponentProps<'div'> & StubExtras & { align?: string; side?: string; sideOffset?: number }) {
	const { open } = useContext(PopoverContext);
	const { rest } = splitExtras(props);
	if (!open) return null;
	return <div {...rest}>{children}</div>;
}
