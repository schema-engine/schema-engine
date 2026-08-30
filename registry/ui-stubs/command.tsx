import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { splitExtras, type StubExtras } from './props';

function moveActiveOption(root: HTMLElement, direction: 1 | -1) {
	const options = Array.from(root.querySelectorAll<HTMLElement>('[role="option"]'));
	if (options.length === 0) {
		return;
	}

	const current = options.findIndex(
		(option) => option.hasAttribute('data-selected') && option.getAttribute('data-selected') !== 'false',
	);
	const nextIndex =
		current < 0
			? direction === 1
				? 0
				: options.length - 1
			: (current + direction + options.length) % options.length;
	options.forEach((option, index) => {
		option.toggleAttribute('data-selected', index === nextIndex);
	});
}

function selectActiveOption(root: HTMLElement) {
	const active = root.querySelector<HTMLElement>('[role="option"][data-selected]:not([data-selected="false"])');
	active?.click();
}

export function Command({
	children,
	shouldFilter: _shouldFilter,
	filter: _filter,
	...props
}: ComponentProps<'div'> &
	StubExtras & { shouldFilter?: boolean; filter?: (value: string, search: string) => number }) {
	const { rest } = splitExtras(props);
	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		rest.onKeyDown?.(event);
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveActiveOption(event.currentTarget, 1);
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveActiveOption(event.currentTarget, -1);
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			selectActiveOption(event.currentTarget);
		}
	};

	return (
		<div {...rest} data-slot="command" onKeyDown={onKeyDown}>
			{children}
		</div>
	);
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
