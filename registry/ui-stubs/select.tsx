import type { ComponentProps, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { splitExtras, type StubExtras } from './props';

const SelectContext = createContext<{ value?: string; onValueChange?: (value: string) => void }>({});

export function Select({
	value,
	onValueChange,
	children,
}: {
	value?: string;
	defaultValue?: string;
	disabled?: boolean;
	onValueChange?: (value: string) => void;
	children?: ReactNode;
}) {
	return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ children, ...props }: ComponentProps<'button'> & StubExtras) {
	const { extras, rest } = splitExtras(props);
	if (extras.render) return <>{extras.render(rest)}</>;
	return (
		<button type="button" {...rest}>
			{children}
		</button>
	);
}

export function SelectValue({ placeholder, children }: { placeholder?: ReactNode; children?: ReactNode }) {
	const { value } = useContext(SelectContext);
	return <span>{children ?? value ?? placeholder}</span>;
}

export function SelectContent({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return (
		<div role="listbox" {...rest}>
			{children}
		</div>
	);
}

export function SelectItem({
	value,
	disabled,
	children,
	...props
}: ComponentProps<'div'> & StubExtras & { value: string; disabled?: boolean }) {
	const context = useContext(SelectContext);
	const { rest } = splitExtras(props);

	return (
		<div
			role="option"
			aria-selected={context.value === value}
			aria-disabled={disabled}
			{...rest}
			onClick={() => context.onValueChange?.(value)}
		>
			{children}
		</div>
	);
}
