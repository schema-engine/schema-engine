'use client';

import * as React from 'react';
import {
	ComboBox as ComboBoxPrimitive,
	ComboBoxStateContext,
	ComboBoxValue as ComboBoxValuePrimitive,
	Group,
	Input as InputPrimitive,
	ListBoxItem as ListBoxItemPrimitive,
	ListBox as ListBoxPrimitive,
	Popover as PopoverPrimitive,
	Tag as TagPrimitive,
	TagGroup as TagGroupPrimitive,
	TagList as TagListPrimitive,
	composeRenderProps,
	type ComboBoxValueProps,
	type GroupProps,
	type InputProps,
	type ListBoxItemProps,
	type ListBoxProps,
	type TagListProps,
	type TagProps,
} from 'react-aria-components';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Combobox = ComboBoxPrimitive;

function ComboboxValue({ ...props }: ComboBoxValueProps<object>) {
	return <ComboBoxValuePrimitive {...props} />;
}

function ComboboxTrigger({
	className,
	children,
	...props
}: React.ComponentProps<'button'> & { children?: React.ReactNode }) {
	return (
		<button
			type="button"
			className={cn('text-muted-foreground inline-flex size-7 items-center justify-center rounded', className)}
			{...props}
		>
			{children}
			<ChevronDown className="size-4" />
		</button>
	);
}

function ComboboxClear({ className, ...props }: React.ComponentProps<'button'>) {
	const state = React.useContext(ComboBoxStateContext);
	if (state?.inputValue === '') {
		return null;
	}

	return (
		<button
			type="button"
			className={cn('text-muted-foreground inline-flex size-7 items-center justify-center', className)}
			onClick={() => state?.setValue(null)}
			{...props}
		>
			<X className="size-4" />
		</button>
	);
}

function ComboboxInput({
	className,
	children,
	disabled = false,
	showTrigger = true,
	showClear = false,
	...props
}: React.ComponentProps<'input'> & {
	showTrigger?: boolean;
	showClear?: boolean;
}) {
	return (
		<div className="relative flex items-center">
			<InputPrimitive
				className={cn(
					'border-input bg-background h-8 w-full rounded-lg border px-2.5 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
					className,
				)}
				disabled={disabled}
				{...props}
			/>
			{showTrigger ? <ComboboxTrigger className="absolute right-1" /> : null}
			{showClear ? <ComboboxClear className="absolute right-8" /> : null}
			{children}
		</div>
	);
}

function ComboboxContent({
	className,
	anchor: _anchor,
	...props
}: Omit<React.ComponentProps<typeof PopoverPrimitive>, 'className' | 'children'> & {
	className?: string;
	children?: React.ReactNode;
	anchor?: React.RefObject<HTMLDivElement | null>;
}) {
	return (
		<PopoverPrimitive
			className={cn(
				'bg-popover text-popover-foreground z-50 min-w-[var(--trigger-width)] rounded-md border p-1 shadow-md',
				className,
			)}
			{...props}
		>
			{props.children}
		</PopoverPrimitive>
	);
}

function ComboboxList<T extends object>({ className, children, items, ...props }: ListBoxProps<T>) {
	return (
		<ListBoxPrimitive className={cn('max-h-60 overflow-y-auto', className)} items={items} {...props}>
			{children}
		</ListBoxPrimitive>
	);
}

function ComboboxItem({ className, children, ...props }: ListBoxItemProps) {
	return (
		<ListBoxItemPrimitive
			className={cn(
				'data-[focused]:bg-accent data-[focused]:text-accent-foreground relative flex cursor-default items-center rounded px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
				className,
			)}
			{...props}
		>
			{composeRenderProps(children, (childrenContent, { isSelected }) => (
				<>
					{childrenContent}
					{isSelected ? <Check className="ml-auto size-4" /> : null}
				</>
			))}
		</ListBoxItemPrimitive>
	);
}

function ComboboxEmpty({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('text-muted-foreground px-2 py-1.5 text-sm', className)} {...props} />;
}

function ComboboxChips({ children, className, ...props }: GroupProps) {
	return (
		<div className="relative flex items-center">
			<Group
				className={cn(
					'border-input bg-background flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border px-2 py-1 pr-9 transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
					className,
				)}
				{...props}
			>
				{children}
			</Group>
			<ComboboxTrigger className="absolute right-1" />
		</div>
	);
}

function ComboboxChipList<T extends object>({
	className,
	...props
}: Omit<TagListProps<T>, 'className'> & { className?: string }) {
	return (
		<ComboBoxValuePrimitive className="contents">
			{({ selectedItems, state }) => (
				<TagGroupPrimitive
					onRemove={(keys) => {
						if (Array.isArray(state.value)) {
							state.setValue(state.value.filter((key) => !keys.has(key)));
						}
					}}
				>
					<TagListPrimitive
						className={cn('flex flex-wrap gap-1', className)}
						items={selectedItems.filter((item): item is T => item != null)}
						{...props}
					/>
				</TagGroupPrimitive>
			)}
		</ComboBoxValuePrimitive>
	);
}

function ComboboxChip({
	className,
	children,
	showRemove = true,
	...props
}: Omit<TagProps, 'children'> & {
	showRemove?: boolean;
	children?: React.ReactNode;
}) {
	return (
		<TagPrimitive
			className={cn('bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs', className)}
			{...props}
		>
			{children}
			{showRemove ? (
				<button
					type="button"
					slot="remove"
					aria-label="Remove"
					className="text-muted-foreground hover:text-foreground"
				>
					<X className="size-3" />
				</button>
			) : null}
		</TagPrimitive>
	);
}

function ComboboxChipsInput({ className, ...props }: InputProps) {
	const state = React.useContext(ComboBoxStateContext);
	return (
		<InputPrimitive
			className={cn(
				'min-w-16 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:ring-0',
				className,
			)}
			onKeyDown={(event) => {
				if (
					event.key === 'Backspace' &&
					event.currentTarget.value === '' &&
					Array.isArray(state?.value) &&
					state.value.length > 0
				) {
					event.preventDefault();
					state.setValue(state.value.slice(0, -1));
				}
			}}
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
	ComboboxChipList,
	ComboboxChipsInput,
	useComboboxAnchor,
};
