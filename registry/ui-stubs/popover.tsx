import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { splitExtras, type StubExtras } from './props';

const PopoverContext = createContext<{
	open: boolean;
	onOpenChange?: (open: boolean) => void;
}>({ open: false });

export function Popover({
	open = false,
	modal: _modal,
	onOpenChange,
	children,
}: {
	open?: boolean;
	modal?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: ReactNode;
}) {
	return <PopoverContext.Provider value={{ open, onOpenChange }}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ children, ...props }: ComponentProps<'button'> & StubExtras) {
	const { open, onOpenChange } = useContext(PopoverContext);
	const { extras, rest } = splitExtras(props);
	const triggerProps = {
		...rest,
		onClick: (event: MouseEvent<HTMLButtonElement>) => {
			rest.onClick?.(event);
			onOpenChange?.(!open);
		},
	};

	if (extras.render) return <>{extras.render(triggerProps)}</>;
	return (
		<button type="button" {...triggerProps}>
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
