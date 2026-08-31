'use client';

import * as React from 'react';
import IMask, { type InputMask } from 'imask';
import { cn } from '@/lib/utils';

type MaskedInputProps = Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'defaultValue'> & {
	mask: string;
	defaultMaskValue?: string;
	unmask?: boolean | 'typed';
	lazy?: boolean;
	overwrite?: boolean;
	placeholderChar?: string;
	definitions?: Record<string, string | RegExp>;
	onAccept?: (value: string) => void;
	onChange?: (value: string) => void;
};

function readMaskValue(mask: InputMask, unmask: boolean | 'typed') {
	if (unmask === 'typed') {
		const typed = mask.typedValue;
		return typed == null ? '' : String(typed);
	}
	if (unmask) return mask.unmaskedValue ?? '';
	return mask.value ?? '';
}

function MaskedInput({
	className,
	mask,
	defaultMaskValue = '',
	unmask,
	lazy,
	overwrite,
	placeholderChar,
	definitions,
	onAccept,
	onChange,
	ref,
	...props
}: MaskedInputProps) {
	const maskRef = React.useRef<InputMask | null>(null);
	const onAcceptRef = React.useRef(onAccept);
	const onChangeRef = React.useRef(onChange);
	const externalRef = React.useRef(ref);
	const unmaskRef = React.useRef(unmask ?? false);
	const defaultMaskValueRef = React.useRef(defaultMaskValue);
	onAcceptRef.current = onAccept;
	onChangeRef.current = onChange;
	externalRef.current = ref;
	unmaskRef.current = unmask ?? false;
	defaultMaskValueRef.current = defaultMaskValue;

	const resolvedDefinitions = React.useMemo(() => {
		if (!definitions) return undefined;
		return Object.fromEntries(
			Object.entries(definitions).map(([key, definition]) => [
				key,
				typeof definition === 'string' ? new RegExp(definition) : definition,
			]),
		);
	}, [definitions]);

	const maskOptions = React.useMemo(() => {
		const options: {
			mask: string;
			lazy?: boolean;
			overwrite?: boolean;
			placeholderChar?: string;
			definitions?: Record<string, RegExp>;
		} = { mask };

		if (lazy !== undefined) options.lazy = lazy;
		if (overwrite !== undefined) options.overwrite = overwrite;
		if (placeholderChar !== undefined) options.placeholderChar = placeholderChar;
		if (resolvedDefinitions) options.definitions = resolvedDefinitions;

		return options;
	}, [mask, lazy, overwrite, placeholderChar, resolvedDefinitions]);

	const setInputRef = React.useCallback(
		(node: HTMLInputElement | null) => {
			if (maskRef.current) {
				maskRef.current.destroy();
				maskRef.current = null;
			}

			const currentRef = externalRef.current;
			if (typeof currentRef === 'function') currentRef(node);
			else if (currentRef) currentRef.current = node;

			if (!node) return;

			const instance = IMask(node, maskOptions);
			maskRef.current = instance;

			if (defaultMaskValueRef.current) instance.value = defaultMaskValueRef.current;

			instance.on('accept', () => {
				const next = readMaskValue(instance, unmaskRef.current);
				onAcceptRef.current?.(next);
				onChangeRef.current?.(next);
			});
		},
		[maskOptions],
	);

	return (
		<input
			{...props}
			ref={setInputRef}
			data-slot="masked-input"
			className={cn(
				'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
				className,
			)}
		/>
	);
}

export { MaskedInput };
export type { MaskedInputProps };
