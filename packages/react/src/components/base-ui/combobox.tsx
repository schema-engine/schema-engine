import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui-components/react/combobox';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

function Combobox({
	multiple,
	value,
	onValueChange,
	options,
	children,
	...props
}: Omit<ComponentProps<typeof BaseCombobox.Root>, 'items' | 'children' | 'defaultValue'> & {
	multiple?: boolean;
	value?: unknown;
	onValueChange?: (value: unknown) => void;
	options?: Array<{ value: string | number; label: string }>;
	children?: React.ReactNode;
}) {
	const handleValueChange = (val: unknown) => {
		if (multiple) {
			const items = Array.isArray(val) ? val : [val];
			const values = items.map((item: any) => String(item?.value ?? item));
			onValueChange?.(values);
		} else {
			const itemValue = (val as any)?.value ?? val;
			onValueChange?.(String(itemValue));
		}
	};

	const findItemByValue = (val: unknown): { value: string | number; label: string } | undefined => {
		if (!options || val === null || val === undefined) return undefined;
		return options.find((opt) => String(opt.value) === String(val));
	};

	const selectedValues =
		multiple && Array.isArray(value)
			? value
					.map((v) => findItemByValue(v))
					.filter((item): item is { value: string | number; label: string } => item !== undefined)
			: [];
	const selectedSingleValue = !multiple && value ? findItemByValue(value) : undefined;

	return (
		<BaseCombobox.Root
			data-slot="combobox"
			multiple={multiple}
			value={multiple ? selectedValues : selectedSingleValue}
			onValueChange={handleValueChange}
			items={options || []}
			itemToStringValue={(item: any) => String(item?.value ?? '')}
			itemToStringLabel={(item: any) => String(item?.label ?? '')}
			{...props}
		>
			{children}
		</BaseCombobox.Root>
	);
}

function ComboboxInput({ ...props }: ComponentProps<typeof BaseCombobox.Input>) {
	return (
		<BaseCombobox.Input
			data-slot="combobox-input"
			className={cn(
				'h-10 w-full rounded-md font-normal border border-gray-200 pl-3.5 text-base text-gray-900 bg-[canvas]',
				'focus:outline focus:outline-2 focus:-outline-offset-1 focus:outline-blue-800',
				props.className,
			)}
			{...props}
		/>
	);
}

function ComboboxTrigger({ ...props }: ComponentProps<typeof BaseCombobox.Trigger>) {
	return (
		<BaseCombobox.Trigger
			data-slot="combobox-trigger"
			className={cn(
				'group flex h-10 w-6 items-center justify-center rounded bg-transparent p-0 text-gray-600',
				'hover:bg-gray-100 transition-colors',
				props.className,
			)}
			{...props}
		>
			{props.children || (
				<ChevronDownIcon className="size-4 group-data-[popup-open]:rotate-180 transition-transform" />
			)}
		</BaseCombobox.Trigger>
	);
}

function ComboboxClear({ ...props }: ComponentProps<typeof BaseCombobox.Clear>) {
	return (
		<BaseCombobox.Clear
			data-slot="combobox-clear"
			className={cn(
				'flex h-10 w-6 items-center justify-center rounded bg-transparent p-0',
				'text-gray-600 hover:bg-gray-100',
				props.className,
			)}
			{...props}
		>
			{props.children || <XIcon className="size-4" />}
		</BaseCombobox.Clear>
	);
}

function ComboboxPortal({ ...props }: ComponentProps<typeof BaseCombobox.Portal>) {
	return <BaseCombobox.Portal data-slot="combobox-portal" {...props} />;
}

function ComboboxPositioner({ ...props }: ComponentProps<typeof BaseCombobox.Positioner>) {
	return (
		<BaseCombobox.Positioner
			data-slot="combobox-positioner"
			className={cn('outline-none', props.className)}
			{...props}
		/>
	);
}

function ComboboxInputTrigger({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="combobox-input-trigger"
			className={cn(
				'relative flex items-center h-10 rounded-md border border-gray-200 px-3.5 bg-[canvas]',
				'focus-within:outline focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue-800',
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxPopup({ ...props }: ComponentProps<typeof BaseCombobox.Popup>) {
	return (
		<BaseCombobox.Popup
			data-slot="combobox-popup"
			className={cn(
				'bg-popover text-popover-foreground relative z-50 max-h-[var(--available-height)]',
				'min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-x-hidden overflow-y-auto',
				'rounded-md border p-1 shadow-md',
				'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0',
				'data-[closed]:zoom-out-95 data-[open]:zoom-in-95',
				'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
				'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				props.className,
			)}
			{...props}
		/>
	);
}

function ComboboxEmpty({ ...props }: ComponentProps<typeof BaseCombobox.Empty>) {
	return (
		<BaseCombobox.Empty
			data-slot="combobox-empty"
			className={cn('text-muted-foreground px-2 py-1.5 text-xs font-medium', props.className)}
			{...props}
		/>
	);
}

function ComboboxList({ ...props }: ComponentProps<typeof BaseCombobox.List>) {
	return <BaseCombobox.List data-slot="combobox-list" {...props} />;
}

function ComboboxItem({ className, children, ...props }: ComponentProps<typeof BaseCombobox.Item>) {
	return (
		<BaseCombobox.Item
			data-slot="combobox-item"
			className={cn(
				'grid cursor-default grid-cols-[1fr_0.75rem] items-center gap-2 py-2 pr-8 pl-4 text-base leading-4 outline-none select-none',
				'[@media(hover:hover)]:[&[data-highlighted]]:relative [@media(hover:hover)]:[&[data-highlighted]]:z-0 [@media(hover:hover)]:[&[data-highlighted]]:text-gray-50',
				'[@media(hover:hover)]:[&[data-highlighted]]:before:absolute [@media(hover:hover)]:[&[data-highlighted]]:before:inset-x-2 [@media(hover:hover)]:[&[data-highlighted]]:before:inset-y-0',
				'[@media(hover:hover)]:[&[data-highlighted]]:before:z-[-1] [@media(hover:hover)]:[&[data-highlighted]]:before:rounded-sm [@media(hover:hover)]:[&[data-highlighted]]:before:bg-gray-900',
				className,
			)}
			{...props}
		>
			<div className="col-start-1">{children}</div>
			<BaseCombobox.ItemIndicator className="col-start-2">
				<CheckIcon className="size-3" />
			</BaseCombobox.ItemIndicator>
		</BaseCombobox.Item>
	);
}

function ComboboxItemIndicator({ ...props }: ComponentProps<typeof BaseCombobox.ItemIndicator>) {
	return (
		<BaseCombobox.ItemIndicator
			data-slot="combobox-item-indicator"
			className={cn('col-start-1', props.className)}
			{...props}
		>
			{props.children || <CheckIcon className="size-3" />}
		</BaseCombobox.ItemIndicator>
	);
}

function ComboboxValue({
	chipData,
	multiple,
	onRemoveChip: onRemoveValue,
	showInput = false,
	inputProps,
	placeholder,
	...props
}: ComponentProps<typeof BaseCombobox.Value> & {
	chipData?: Array<{ value: string; label: string }>;
	multiple?: boolean;
	onRemoveChip?: (value: string) => void;
	inputProps?: ComponentProps<typeof BaseCombobox.Input>;
	placeholder?: string;
}) {
	return (
		<BaseCombobox.Value data-slot="combobox-value" {...(props as any)}>
			{() => {
				if (multiple) {
					return (
						<div className="flex flex-wrap gap-1 overflow-hidden items-center py-1.5 w-full">
							{chipData && chipData.length > 0
								? chipData.map((chip) => (
										<ComboboxChip
											key={chip.value}
											label={chip.label}
											onRemove={() => onRemoveValue?.(chip.value)}
										/>
									))
								: null}
							<ComboboxInput
								placeholder={placeholder || (chipData && chipData.length > 0 ? '' : 'Select...')}
								className="min-w-12 flex-1 h-6 rounded-md border-0 bg-transparent pl-2 outline-none focus:ring-0 focus:border-none focus-visible:outline-none "
								{...inputProps}
							/>
						</div>
					);
				}

				return (
					<ComboboxInput
						placeholder={placeholder || 'Select...'}
						className="min-w-12 flex-1 h-full border-0 bg-transparent pl-0"
						{...inputProps}
					/>
				);
			}}
		</BaseCombobox.Value>
	);
}

function ComboboxChip({
	label,
	onRemove,
	...props
}: {
	label: string;
	onRemove?: () => void;
} & ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-sm text-gray-900 outline-none cursor-default',
				'[@media(hover:hover)]:[&[data-highlighted]]:bg-blue-800 [@media(hover:hover)]:[&[data-highlighted]]:text-gray-50',
				'focus-within:bg-blue-800 focus-within:text-gray-50',
				props.className,
			)}
		>
			<span>{label}</span>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onRemove?.();
				}}
				className="rounded-md p-1 text-inherit hover:bg-gray-200 transition-colors"
				aria-label={`Remove ${label}`}
			>
				<XIcon className="size-3" />
			</button>
		</div>
	);
}

function ComboboxChips({ ...props }: ComponentProps<typeof BaseCombobox.Chips>) {
	return (
		<BaseCombobox.Chips
			data-slot="combobox-chips"
			className={cn(
				'flex flex-wrap items-center gap-0.5 rounded-md border border-gray-200 px-1.5 py-1 w-full',
				'focus-within:outline focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue-800',
				props.className,
			)}
			{...props}
		/>
	);
}

function ComboboxGroup({ ...props }: ComponentProps<typeof BaseCombobox.Group>) {
	return <BaseCombobox.Group data-slot="combobox-group" {...props} />;
}

function ComboboxGroupLabel({ ...props }: ComponentProps<typeof BaseCombobox.GroupLabel>) {
	return (
		<BaseCombobox.GroupLabel
			data-slot="combobox-group-label"
			className={cn('px-4 py-2 text-sm font-medium text-gray-600', props.className)}
			{...props}
		/>
	);
}

function ComboboxSeparator({ ...props }: ComponentProps<typeof BaseCombobox.Separator>) {
	return (
		<BaseCombobox.Separator
			data-slot="combobox-separator"
			className={cn('my-1 h-px bg-gray-200', props.className)}
			{...props}
		/>
	);
}

const ComboboxChipsTrigger = React.forwardRef<HTMLDivElement, ComponentProps<typeof BaseCombobox.Chips>>(
	({ className, ...props }, ref) => {
		return (
			<BaseCombobox.Chips
				ref={ref}
				data-slot="combobox-chips-trigger"
				className={cn(
					'flex flex-wrap items-center gap-0.5 rounded-md border border-gray-200 px-1.5 w-full',
					'focus-within:outline focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-blue-800',
					className,
				)}
				{...props}
			/>
		);
	},
);
ComboboxChipsTrigger.displayName = 'ComboboxChipsTrigger';

export {
	Combobox,
	ComboboxInput,
	ComboboxInputTrigger,
	ComboboxTrigger,
	ComboboxClear,
	ComboboxPortal,
	ComboboxPositioner,
	ComboboxPopup,
	ComboboxEmpty,
	ComboboxList,
	ComboboxItem,
	ComboboxItemIndicator,
	ComboboxValue,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsTrigger,
	ComboboxGroup,
	ComboboxGroupLabel,
	ComboboxSeparator,
};
