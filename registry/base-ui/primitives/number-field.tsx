'use client';

import * as React from 'react';
import { NumberField as NumberFieldPrimitive } from '@base-ui/react/number-field';
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
	const numericValue = typeof value === 'number' ? value : null;

	return (
		<NumberFieldPrimitive.Root
			id={id}
			name={name}
			value={numericValue}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			required={required}
			onValueChange={(next) => onChange?.(next ?? '')}
			className={cn('w-full', className)}
		>
			<NumberFieldPrimitive.Group
				data-se-control
				className="flex h-8 w-full overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:opacity-50"
			>
				<NumberFieldPrimitive.Input
					placeholder={placeholder}
					autoComplete={autoComplete}
					autoFocus={autoFocus}
					inputMode={inputMode}
					onBlur={onBlur}
					onFocus={onFocus}
					className="min-w-0 flex-1 border-0 bg-transparent px-2.5 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
				<div className="flex shrink-0 border-s border-input">
					<NumberFieldPrimitive.Decrement
						data-se-control
						className="text-muted-foreground inline-flex size-8 items-center justify-center transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
						aria-label="Decrease value"
					>
						<Minus className="size-3.5" />
					</NumberFieldPrimitive.Decrement>
					<NumberFieldPrimitive.Increment
						data-se-control
						className="text-muted-foreground inline-flex size-8 items-center justify-center border-s border-input transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
						aria-label="Increase value"
					>
						<Plus className="size-3.5" />
					</NumberFieldPrimitive.Increment>
				</div>
			</NumberFieldPrimitive.Group>
		</NumberFieldPrimitive.Root>
	);
}

export { NumberField };
