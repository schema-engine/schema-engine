import { Select as BaseSelect } from '@base-ui-components/react/select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

function Select({
	multiple,
	value,
	onValueChange,
	options,
	children,
	...props
}: ComponentProps<typeof BaseSelect.Root> & {
	multiple?: boolean;
	value?: unknown;
	onValueChange?: (value: unknown) => void;
	options?: Array<{ value: string | number; label: string }>;
}) {
	const handleValueChange = (val: unknown) => {
		if (multiple) {
			const newValues = Array.isArray(val) ? val.map(String) : [String(val)];
			onValueChange?.(newValues);
		} else {
			onValueChange?.(String(val));
		}
	};

	const values = multiple && Array.isArray(value) ? value : multiple ? [] : value ? [value] : [];

	return (
		<BaseSelect.Root
			data-slot="select"
			multiple={multiple}
			value={multiple ? values.map(String) : value ? String(value) : ''}
			onValueChange={handleValueChange}
			{...props}
		>
			{children}
		</BaseSelect.Root>
	);
}

function SelectGroup({ ...props }: ComponentProps<typeof BaseSelect.Group>) {
	return <BaseSelect.Group data-slot="select-group" {...props} />;
}

function SelectPortal({ ...props }: ComponentProps<typeof BaseSelect.Portal>) {
	return <BaseSelect.Portal data-slot="select-portal" {...props} />;
}

function SelectPositioner({ ...props }: ComponentProps<typeof BaseSelect.Positioner>) {
	return <BaseSelect.Positioner data-slot="select-positioner" {...props} />;
}

function SelectValue({
	className,
	children,
	options: chipData,
	multiple,
	values,
	onRemoveValue,
	...props
}: ComponentProps<typeof BaseSelect.Value> & {
	children?: ReactNode;
	options?: Array<{ value: string; label: string }>;
	multiple?: boolean;
	values?: string[];
	onRemoveValue?: (value: string) => void;
}) {
	return (
		<BaseSelect.Value data-slot="select-value" className={cn('text-sm', className)} {...props}>
			{multiple && chipData && chipData.length > 0 ? (
				<div className="flex w-full flex-wrap gap-1 overflow-hidden">
					{chipData.map((chip) => (
						<SelectChip key={chip.value} label={chip.label} onRemove={() => onRemoveValue?.(chip.value)} />
					))}
				</div>
			) : multiple ? (
				<span className="text-muted-foreground">Select options...</span>
			) : (
				children
			)}
		</BaseSelect.Value>
	);
}

function SelectTrigger({
	className,
	size = 'default',
	children,
	...props
}: ComponentProps<typeof BaseSelect.Trigger> & {
	size?: 'sm' | 'default';
}) {
	return (
		<BaseSelect.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				"group [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/50 aria-invalid:border-destructive bg-input hover:border-ring/70 flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow,border-color] outline-none select-none focus-visible:ring-[3px] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[size=default]:min-h-9 data-[size=sm]:min-h-8 data-[popup-open]:[&_*[data-slot=select-icon]]:rotate-180 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			{children}
			<BaseSelect.Icon>
				<ChevronDownIcon
					data-slot="select-icon"
					className="size-4 shrink-0 opacity-50 transition-transform duration-200"
				/>
			</BaseSelect.Icon>
		</BaseSelect.Trigger>
	);
}

function SelectContent({
	className,
	children,
	sideOffset = 4,
	position = 'popper',
	...props
}: ComponentProps<typeof BaseSelect.Popup> & {
	sideOffset?: BaseSelect.Positioner.Props['sideOffset'];
	position?: 'popper' | 'item-aligned';
}) {
	return (
		<SelectPortal>
			<SelectPositioner sideOffset={sideOffset} alignItemWithTrigger={position === 'item-aligned'}>
				<SelectScrollUpButton />
				<BaseSelect.Popup
					data-slot="select-content"
					className={cn(
						'bg-popover text-popover-foreground data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[var(--available-height)] min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md',
						position === 'item-aligned' && '[&_*[data-slot=select-item]]:min-w-[var(--anchor-width)]',
						className,
					)}
					{...props}
				>
					{children}
				</BaseSelect.Popup>
				<SelectScrollDownButton />
			</SelectPositioner>
		</SelectPortal>
	);
}

function SelectItem({ className, children, ...props }: ComponentProps<typeof BaseSelect.Item>) {
	return (
		<BaseSelect.Item
			data-slot="select-item"
			className={cn(
				'grid cursor-default grid-cols-[1fr_0.75rem] items-center gap-2 py-2 pr-8 pl-4 text-base leading-4 outline-none select-none',
				'[@media(hover:hover)]:[&[data-highlighted]]:relative [@media(hover:hover)]:[&[data-highlighted]]:z-0 [@media(hover:hover)]:[&[data-highlighted]]:text-gray-50',
				'[@media(hover:hover)]:[&[data-highlighted]]:before:absolute [@media(hover:hover)]:[&[data-highlighted]]:before:inset-x-2 [@media(hover:hover)]:[&[data-highlighted]]:before:inset-y-0',
				'[@media(hover:hover)]:[&[data-highlighted]]:before:z-[-1] [@media(hover:hover)]:[&[data-highlighted]]:before:rounded-sm [@media(hover:hover)]:[&[data-highlighted]]:before:bg-gray-900',
				className,
			)}
			{...props}
		>
			<BaseSelect.ItemText className="col-start-1">{children}</BaseSelect.ItemText>
			<BaseSelect.ItemIndicator className="col-start-2">
				<CheckIcon className="size-3" />
			</BaseSelect.ItemIndicator>
		</BaseSelect.Item>
	);
}

function SelectLabel({ className, ...props }: ComponentProps<typeof BaseSelect.GroupLabel>) {
	return (
		<BaseSelect.GroupLabel
			data-slot="select-label"
			className={cn('text-muted-foreground px-2 py-1.5 text-xs font-medium', className)}
			{...props}
		/>
	);
}

function SelectSeparator({ className, ...props }: ComponentProps<typeof BaseSelect.Separator>) {
	return (
		<BaseSelect.Separator
			data-slot="select-separator"
			className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({ className, ...props }: ComponentProps<typeof BaseSelect.ScrollUpArrow>) {
	return (
		<BaseSelect.ScrollUpArrow
			data-slot="select-scroll-up-button"
			className={cn(
				'bg-popover top-px left-[1px] z-[100] flex w-[calc(100%-2px)] cursor-default items-center justify-center rounded-t-md py-1',
				className,
			)}
			{...props}
		>
			<ChevronUpIcon className="size-4" />
		</BaseSelect.ScrollUpArrow>
	);
}

function SelectScrollDownButton({ className, ...props }: ComponentProps<typeof BaseSelect.ScrollDownArrow>) {
	return (
		<BaseSelect.ScrollDownArrow
			data-slot="select-scroll-down-button"
			className={cn(
				'bg-popover bottom-px left-[1px] z-[100] flex w-[calc(100%-2px)] cursor-default items-center justify-center rounded-b-md py-1',
				className,
			)}
			{...props}
		>
			<ChevronDownIcon className="size-4" />
		</BaseSelect.ScrollDownArrow>
	);
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel, SelectSeparator };

function SelectChip({ label, onRemove, className }: { label: string; onRemove: () => void; className?: string }) {
	return (
		<div
			className={cn(
				'flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-sm text-gray-900 outline-none cursor-default',
				'[@media(hover:hover)]:[&[data-highlighted]]:bg-blue-800 [@media(hover:hover)]:[&[data-highlighted]]:text-gray-50',
				'focus-within:bg-blue-800 focus-within:text-gray-50',
				className,
			)}
		>
			<span>{label}</span>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				className="rounded-md p-1 text-inherit hover:bg-gray-200 transition-colors"
				aria-label={`Remove ${label}`}
			>
				<XIcon className="size-3" />
			</button>
		</div>
	);
}

export { SelectChip };
