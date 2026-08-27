'use client';

import * as React from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ComboboxContextValue = {
	multiple?: boolean;
	value: unknown;
	onValueChange: (value: unknown) => void;
	items: unknown[];
	itemToStringValue?: (item: unknown) => string;
	itemToStringLabel?: (item: unknown) => string;
	open: boolean;
	setOpen: (open: boolean) => void;
	disabled?: boolean;
};

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext() {
	const context = React.useContext(ComboboxContext);
	if (!context) {
		throw new Error('Combobox components must be used within Combobox');
	}
	return context;
}

type ComboboxRootProps = {
	children?: React.ReactNode;
	multiple?: boolean;
	value?: unknown;
	onValueChange?: (value: unknown) => void;
	items?: unknown[];
	itemToStringValue?: (item: unknown) => string;
	itemToStringLabel?: (item: unknown) => string;
	disabled?: boolean;
};

function Combobox({
	children,
	multiple = false,
	value,
	onValueChange,
	items = [],
	itemToStringValue,
	itemToStringLabel,
	disabled,
}: ComboboxRootProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<ComboboxContext.Provider
			value={{
				multiple,
				value,
				onValueChange: onValueChange ?? (() => undefined),
				items,
				itemToStringValue,
				itemToStringLabel,
				open,
				setOpen,
				disabled,
			}}
		>
			<Popover open={open} onOpenChange={setOpen} modal>
				{children}
			</Popover>
		</ComboboxContext.Provider>
	);
}

function ComboboxInput({
	className,
	placeholder,
	onBlur,
	onFocus,
}: {
	className?: string;
	placeholder?: string;
	onBlur?: React.FocusEventHandler<HTMLButtonElement>;
	onFocus?: React.FocusEventHandler<HTMLButtonElement>;
}) {
	const { multiple, value, itemToStringLabel, open, disabled } = useComboboxContext();

	if (multiple) {
		return null;
	}

	const selected = value as { label?: string } | null;
	const display = selected && itemToStringLabel ? itemToStringLabel(selected) : '';

	return (
		<PopoverTrigger
			type="button"
			role="combobox"
			aria-expanded={open}
			disabled={disabled}
			className={cn(
				'border-input bg-background flex h-8 w-full items-center justify-between rounded-lg border px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			onFocus={onFocus}
			onBlur={onBlur}
		>
			<span className={cn(!display && 'text-muted-foreground')}>{display || placeholder || 'Select...'}</span>
			<ChevronDown className="size-4 text-muted-foreground" />
		</PopoverTrigger>
	);
}

function ComboboxTrigger({ className, ...props }: React.ComponentProps<'button'>) {
	return (
		<button
			type="button"
			className={cn('text-muted-foreground inline-flex size-7 items-center justify-center rounded', className)}
			{...props}
		>
			<ChevronDown className="size-4" />
		</button>
	);
}

function ComboboxClear({ className, ...props }: React.ComponentProps<'button'>) {
	const { onValueChange, multiple } = useComboboxContext();
	return (
		<button
			type="button"
			className={cn('text-muted-foreground inline-flex size-7 items-center justify-center', className)}
			onClick={() => onValueChange(multiple ? [] : null)}
			{...props}
		>
			<X className="size-4" />
		</button>
	);
}

function ComboboxContent({
	className,
	anchor: _anchor,
	...props
}: React.ComponentProps<'div'> & { anchor?: React.RefObject<HTMLDivElement | null> }) {
	return (
		<PopoverContent
			className={cn('w-[var(--radix-popover-trigger-width)] p-0', className)}
			align="start"
			{...props}
		>
			<Command shouldFilter>
				<CommandInput placeholder="Search..." />
				<CommandList>
					<ComboboxEmpty />
					<ComboboxList />
				</CommandList>
			</Command>
		</PopoverContent>
	);
}

function ComboboxList({
	className,
	children,
	...props
}: {
	className?: string;
	children?: (item: unknown) => React.ReactNode;
}) {
	const { items, multiple, value, onValueChange, itemToStringValue, setOpen } = useComboboxContext();
	const selectedValues = multiple
		? ((value as unknown[]) ?? []).map((item) => (itemToStringValue ? itemToStringValue(item) : String(item)))
		: [];

	return (
		<CommandGroup className={cn('max-h-60 overflow-y-auto', className)} {...props}>
			{items.map((item) => {
				const itemKey = itemToStringValue ? itemToStringValue(item) : String(item);
				const isSelected = multiple
					? selectedValues.includes(itemKey)
					: value != null && itemToStringValue?.(value) === itemKey;

				return (
					<CommandItem
						key={itemKey}
						value={itemKey}
						onSelect={() => {
							if (multiple) {
								const current = (value as unknown[]) ?? [];
								const exists = current.some((entry) => itemToStringValue?.(entry) === itemKey);
								const next = exists
									? current.filter((entry) => itemToStringValue?.(entry) !== itemKey)
									: [...current, item];
								onValueChange(next);
							} else {
								onValueChange(item);
								setOpen(false);
							}
						}}
					>
						{children ? children(item) : itemKey}
						{isSelected ? <Check className="ml-auto size-4" /> : null}
					</CommandItem>
				);
			})}
		</CommandGroup>
	);
}

function ComboboxItem({
	className,
	children,
	value: _value,
	...props
}: React.ComponentProps<'div'> & { value?: unknown }) {
	return (
		<div
			className={cn('relative flex cursor-default items-center rounded px-2 py-1.5 text-sm', className)}
			{...props}
		>
			{children}
		</div>
	);
}

function ComboboxEmpty({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<CommandEmpty className={cn('text-muted-foreground px-2 py-1.5 text-sm', className)} {...props}>
			No options found.
		</CommandEmpty>
	);
}

function ComboboxValue({ ...props }: React.ComponentProps<'span'>) {
	return <span {...props} />;
}

function ComboboxChips({ className, children, ...props }: React.ComponentProps<'div'>) {
	const { disabled, setOpen } = useComboboxContext();
	return (
		<div
			className={cn(
				'border-input bg-background flex min-h-8 flex-wrap items-center gap-1 rounded-lg border px-2 py-1 transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
				disabled && 'opacity-50',
				className,
			)}
			onClick={() => setOpen(true)}
			{...props}
		>
			{children}
		</div>
	);
}

function ComboboxChip({ className, children, ...props }: React.ComponentProps<'span'> & { onRemove?: () => void }) {
	const { onValueChange, value, multiple, itemToStringValue } = useComboboxContext();

	return (
		<span
			className={cn('bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs', className)}
			{...props}
		>
			{children}
			<button
				type="button"
				aria-label="Remove"
				className="text-muted-foreground hover:text-foreground"
				onClick={() => {
					if (!multiple) return;
					const label = typeof children === 'string' ? children : '';
					const current = (value as unknown[]) ?? [];
					const next = current.filter((entry) => {
						if (itemToStringValue) {
							return itemToStringValue(entry) !== label;
						}
						return String(entry) !== label;
					});
					onValueChange(next);
				}}
			>
				<X className="size-3" />
			</button>
		</span>
	);
}

function ComboboxChipsInput({ className, placeholder, onBlur, onFocus, ...props }: React.ComponentProps<'input'>) {
	const { setOpen, disabled } = useComboboxContext();

	return (
		<input
			className={cn(
				'min-w-16 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:ring-0',
				className,
			)}
			placeholder={placeholder}
			disabled={disabled}
			onFocus={(event) => {
				setOpen(true);
				onFocus?.(event);
			}}
			onBlur={onBlur}
			{...props}
		/>
	);
}

function useComboboxAnchor() {
	return React.useRef<HTMLDivElement | null>(null);
}

export {
	Combobox,
	ComboboxInput,
	ComboboxTrigger,
	ComboboxClear,
	ComboboxContent,
	ComboboxList,
	ComboboxItem,
	ComboboxEmpty,
	ComboboxValue,
	ComboboxChips,
	ComboboxChip,
	ComboboxChipsInput,
	useComboboxAnchor,
};
