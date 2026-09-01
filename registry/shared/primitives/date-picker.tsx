'use client';

import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { parseISODate, toISODate } from './date-utils';

type DatePickerProps = Omit<ComponentProps<'button'>, 'onChange' | 'value'> & {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	dateFormat?: string;
	min?: string;
	max?: string;
};

function DatePicker({
	className,
	value,
	onChange,
	placeholder = 'Pick a date',
	dateFormat = 'PPP',
	disabled,
	id,
	min,
	max,
	...props
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const selected = parseISODate(value);
	const minDate = parseISODate(min);
	const maxDate = parseISODate(max);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={(triggerProps) => (
					<Button
						{...triggerProps}
						{...props}
						id={id}
						type="button"
						variant="outline"
						disabled={disabled}
						data-empty={!selected}
						className={cn(
							'w-full justify-start gap-2 px-2.5 text-left font-normal data-[empty=true]:text-muted-foreground',
							className,
						)}
					>
						<CalendarIcon />
						{selected ? format(selected, dateFormat) : <span>{placeholder}</span>}
					</Button>
				)}
			/>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={selected}
					defaultMonth={selected}
					disabled={(date: Date) => {
						if (minDate && date < minDate) {
							return true;
						}
						if (maxDate && date > maxDate) {
							return true;
						}
						return false;
					}}
					onSelect={(date: Date | undefined) => {
						onChange?.(toISODate(date));
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

export { DatePicker };
