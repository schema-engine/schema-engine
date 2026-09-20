'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

type DateParts = {
	day: number;
	month: number;
	year: number;
};

type DateInputProps = {
	value?: Date;
	onChange: (date: Date) => void;
	className?: string;
	disabled?: boolean;
};

function toParts(value?: Date): DateParts {
	const date = value ? new Date(value) : new Date();
	return {
		day: date.getDate(),
		month: date.getMonth() + 1,
		year: date.getFullYear(),
	};
}

function isValidParts(parts: DateParts) {
	if (parts.month < 1 || parts.month > 12 || parts.year < 1000 || parts.year > 9999) {
		return false;
	}

	const date = new Date(parts.year, parts.month - 1, parts.day);
	return date.getFullYear() === parts.year && date.getMonth() + 1 === parts.month && date.getDate() === parts.day;
}

const ALLOWED_DATE_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Delete',
	'Tab',
	'Backspace',
	'Enter',
]);

function isAllowedDateKey(key: string): boolean {
	return /^[0-9]$/.test(key) || ALLOWED_DATE_KEYS.has(key);
}

function focusAdjacentDateField(
	field: keyof DateParts,
	direction: 'forward' | 'backward',
	refs: {
		month: HTMLInputElement | null;
		day: HTMLInputElement | null;
		year: HTMLInputElement | null;
	},
): void {
	if (direction === 'forward') {
		if (field === 'month') refs.day?.focus();
		if (field === 'day') refs.year?.focus();
		return;
	}
	if (field === 'day') refs.month?.focus();
	if (field === 'year') refs.day?.focus();
}

/**
 * Three-part date entry backed by a draft the user edits freely.
 *
 * @remarks
 * A new `value` is adopted during render rather than from an effect, so the
 * inputs never paint one frame of the previous date. The comparison is by
 * timestamp, so a fresh `Date` for the same instant cannot reset the draft
 * mid-edit. `committed` holds the last valid parts to revert to on blur.
 */
function DateInput({ value, onChange, className, disabled }: DateInputProps) {
	const [parts, setParts] = useState<DateParts>(() => toParts(value));
	const [committed, setCommitted] = useState<DateParts>(parts);
	const [syncedTime, setSyncedTime] = useState(() => value?.getTime());
	const monthRef = useRef<HTMLInputElement>(null);
	const dayRef = useRef<HTMLInputElement>(null);
	const yearRef = useRef<HTMLInputElement>(null);

	if (value?.getTime() !== syncedTime) {
		const next = toParts(value);
		setSyncedTime(value?.getTime());
		setParts(next);
		setCommitted(next);
	}

	const commit = (next: DateParts) => {
		setParts(next);
		if (isValidParts(next)) {
			onChange(new Date(next.year, next.month - 1, next.day));
		}
	};

	const handleChange = (field: keyof DateParts, raw: string) => {
		const nextValue = raw === '' ? '' : Number(raw);
		if (nextValue !== '' && Number.isNaN(nextValue)) {
			return;
		}

		const next = { ...parts, [field]: nextValue };
		commit(next as DateParts);
	};

	const handleBlur = (field: keyof DateParts, raw: string) => {
		if (!raw) {
			setParts(committed);
			return;
		}

		const next = { ...parts, [field]: Number(raw) };
		if (!isValidParts(next)) {
			setParts(committed);
			return;
		}

		setCommitted(next);
	};

	const handleKeyDown = (field: keyof DateParts) => (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.metaKey || event.ctrlKey) {
			return;
		}

		if (!isAllowedDateKey(event.key)) {
			event.preventDefault();
		}

		const refs = { month: monthRef.current, day: dayRef.current, year: yearRef.current };
		if (event.key === 'ArrowRight' && event.currentTarget.selectionStart === event.currentTarget.value.length) {
			event.preventDefault();
			focusAdjacentDateField(field, 'forward', refs);
		}

		if (event.key === 'ArrowLeft' && event.currentTarget.selectionStart === 0) {
			event.preventDefault();
			focusAdjacentDateField(field, 'backward', refs);
		}
	};

	const inputClassName =
		'border-0 bg-transparent p-0 text-center text-sm shadow-none outline-none focus-visible:ring-0';

	return (
		<div
			className={cn(
				'border-input bg-background flex h-8 items-center rounded-lg border px-2 text-sm shadow-xs',
				disabled && 'pointer-events-none opacity-50',
				className,
			)}
		>
			<input
				ref={monthRef}
				type="text"
				inputMode="numeric"
				disabled={disabled}
				value={parts.month}
				onChange={(event) => handleChange('month', event.target.value)}
				onBlur={(event) => handleBlur('month', event.target.value)}
				onKeyDown={handleKeyDown('month')}
				className={cn(inputClassName, 'w-6')}
				placeholder="M"
				aria-label="Month"
			/>
			<span className="text-muted-foreground">/</span>
			<input
				ref={dayRef}
				type="text"
				inputMode="numeric"
				disabled={disabled}
				value={parts.day}
				onChange={(event) => handleChange('day', event.target.value)}
				onBlur={(event) => handleBlur('day', event.target.value)}
				onKeyDown={handleKeyDown('day')}
				className={cn(inputClassName, 'w-7')}
				placeholder="D"
				aria-label="Day"
			/>
			<span className="text-muted-foreground">/</span>
			<input
				ref={yearRef}
				type="text"
				inputMode="numeric"
				disabled={disabled}
				value={parts.year}
				onChange={(event) => handleChange('year', event.target.value)}
				onBlur={(event) => handleBlur('year', event.target.value)}
				onKeyDown={handleKeyDown('year')}
				className={cn(inputClassName, 'w-12')}
				placeholder="YYYY"
				aria-label="Year"
			/>
		</div>
	);
}

export { DateInput };
