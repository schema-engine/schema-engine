import type { ComponentProps, ReactNode } from 'react';
import { splitExtras, type StubExtras } from './props';

export function Command({
	children,
	shouldFilter: _shouldFilter,
	filter: _filter,
	...props
}: ComponentProps<'div'> &
	StubExtras & { shouldFilter?: boolean; filter?: (value: string, search: string) => number }) {
	const { rest } = splitExtras(props);
	return <div {...rest}>{children}</div>;
}

export function CommandInput({
	onValueChange,
	...props
}: Omit<ComponentProps<'input'>, 'onChange'> & StubExtras & { onValueChange?: (value: string) => void }) {
	const { rest } = splitExtras(props);
	return <input {...rest} onChange={(event) => onValueChange?.(event.target.value)} />;
}

export function CommandList({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <div {...rest}>{children}</div>;
}

export function CommandEmpty({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <div {...rest}>{children}</div>;
}

export function CommandGroup({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <div {...rest}>{children}</div>;
}

export function CommandItem({
	onSelect,
	children,
	...props
}: Omit<ComponentProps<'div'>, 'onSelect'> &
	StubExtras & { value?: string; onSelect?: (value: string) => void; children?: ReactNode }) {
	const { rest } = splitExtras(props);
	return (
		<div role="option" aria-selected={false} {...rest} onClick={() => onSelect?.(String(props.value ?? ''))}>
			{children}
		</div>
	);
}
