'use client';

import * as React from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Combobox = ComboboxPrimitive.Root;

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
	return (
		<div className="relative flex items-center">
			<ComboboxPrimitive.Input
				className={cn(
					'border-input bg-background h-8 w-full rounded-lg border px-2.5 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
					className,
				)}
				{...props}
			/>
			<ComboboxTrigger className="absolute right-1" />
		</div>
	);
}

function ComboboxTrigger({ className, ...props }: ComboboxPrimitive.Trigger.Props) {
	return (
		<ComboboxPrimitive.Trigger
			className={cn('text-muted-foreground inline-flex size-7 items-center justify-center rounded', className)}
			{...props}
		>
			<ChevronDown className="size-4" />
		</ComboboxPrimitive.Trigger>
	);
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
	return (
		<ComboboxPrimitive.Clear
			className={cn('text-muted-foreground inline-flex size-7 items-center justify-center', className)}
			{...props}
		>
			<X className="size-4" />
		</ComboboxPrimitive.Clear>
	);
}

function ComboboxContent({
	className,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<ComboboxPrimitive.Positioner.Props, 'anchor' | 'side' | 'sideOffset' | 'align'>) {
	const { anchor, side = 'bottom', sideOffset = 4, align = 'start', ...popupProps } = props;
	return (
		<ComboboxPrimitive.Portal>
			<ComboboxPrimitive.Positioner
				anchor={anchor}
				side={side}
				sideOffset={sideOffset}
				align={align}
				className="isolate z-50"
			>
				<ComboboxPrimitive.Popup
					className={cn(
						'bg-popover text-popover-foreground min-w-(--anchor-width) rounded-md border p-1 shadow-md',
						className,
					)}
					{...popupProps}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
	return <ComboboxPrimitive.List className={cn('max-h-60 overflow-y-auto', className)} {...props} />;
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
	return (
		<ComboboxPrimitive.Item
			className={cn(
				'data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-center rounded px-2 py-1.5 text-sm outline-none',
				className,
			)}
			{...props}
		>
			{children}
			<ComboboxPrimitive.ItemIndicator className="ml-auto">
				<Check className="size-4" />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	);
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty className={cn('text-muted-foreground px-2 py-1.5 text-sm', className)} {...props} />
	);
}

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
	return <ComboboxPrimitive.Value {...props} />;
}

function ComboboxChips({ className, children, ...props }: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips>) {
	return (
		<div className="relative flex items-center">
			<ComboboxPrimitive.Chips
				className={cn(
					'border-input bg-background flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border px-2 py-1 pr-9 transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
					className,
				)}
				{...props}
			>
				{children}
			</ComboboxPrimitive.Chips>
			<ComboboxTrigger className="absolute right-1" />
		</div>
	);
}

function ComboboxChip({ className, children, ...props }: ComboboxPrimitive.Chip.Props) {
	return (
		<ComboboxPrimitive.Chip
			className={cn('bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs', className)}
			{...props}
		>
			{children}
			<ComboboxPrimitive.ChipRemove aria-label="Remove">
				<X className="size-3" />
			</ComboboxPrimitive.ChipRemove>
		</ComboboxPrimitive.Chip>
	);
}

function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
	return (
		<ComboboxPrimitive.Input
			className={cn(
				'min-w-16 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:ring-0',
				className,
			)}
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
