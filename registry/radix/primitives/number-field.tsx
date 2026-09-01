'use client';

import * as React from 'react';
import { Button, Group, Input, NumberField as AriaNumberField } from 'react-aria-components';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type NumberFieldProps = {
	value?: number | '';
	onChange?: (value: number | '') => void;
	onBlur?: React.FocusEventHandler<HTMLInputElement>;
	onFocus?: React.FocusEventHandler<HTMLInputElement>;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	placeholder?: string;
	id?: string;
	name?: string;
	autoComplete?: string;
	autoFocus?: boolean;
	inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
	required?: boolean;
	className?: string;
};

function NumberField({
	value,
	onChange,
	onBlur,
	onFocus,
	min,
	max,
	step,
	disabled,
	placeholder,
	id,
	name,
	autoComplete,
	autoFocus,
	inputMode,
	required,
	className,
}: NumberFieldProps) {
	const numericValue = typeof value === 'number' ? value : undefined;

	return (
		<AriaNumberField
			id={id}
			name={name}
			value={numericValue}
			minValue={min}
			maxValue={max}
			step={step}
			isDisabled={disabled}
			isRequired={required}
			onChange={(next) => onChange?.(next ?? '')}
			className={cn('w-full', className)}
		>
			<Group className="flex h-8 w-full overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 data-disabled:opacity-50">
				<Input
					placeholder={placeholder}
					autoComplete={autoComplete}
					autoFocus={autoFocus}
					inputMode={inputMode}
					onBlur={onBlur}
					onFocus={onFocus}
					className="min-w-0 flex-1 border-0 bg-transparent px-2.5 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				<div className="flex shrink-0 border-s border-input">
					<Button
						slot="decrement"
						className="text-muted-foreground inline-flex size-8 items-center justify-center transition-colors pressed:bg-muted hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
					>
						<Minus className="size-3.5" />
					</Button>
					<Button
						slot="increment"
						className="text-muted-foreground inline-flex size-8 items-center justify-center border-s border-input transition-colors pressed:bg-muted hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
					>
						<Plus className="size-3.5" />
					</Button>
				</div>
			</Group>
		</AriaNumberField>
	);
}

export { NumberField };
