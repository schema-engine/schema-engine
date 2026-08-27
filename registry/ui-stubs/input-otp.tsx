import type { ComponentProps, ReactNode } from 'react';
import { splitExtras, type StubExtras } from './props';

/** shadcn's InputOTP reports the whole value as a string, not a DOM event. */
interface InputOTPProps extends StubExtras {
	value?: string;
	maxLength?: number;
	disabled?: boolean;
	id?: string;
	name?: string;
	className?: string;
	containerClassName?: string;
	autoFocus?: boolean;
	onChange?: (value: string) => void;
	onComplete?: (value: string) => void;
	onBlur?: (value: unknown) => void;
	onFocus?: (value: unknown) => void;
	children?: ReactNode;
}

export function InputOTP({
	children,
	onChange,
	onBlur,
	onFocus,
	onComplete: _onComplete,
	containerClassName: _containerClassName,
	...props
}: InputOTPProps) {
	const { rest } = splitExtras(props);

	return (
		<>
			<input
				{...rest}
				onChange={(event) => onChange?.(event.target.value)}
				onBlur={(event) => onBlur?.(event)}
				onFocus={(event) => onFocus?.(event)}
			/>
			{children}
		</>
	);
}

export function InputOTPGroup({ children, ...props }: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <div {...rest}>{children}</div>;
}

export function InputOTPSlot({ index: _index, ...props }: ComponentProps<'div'> & StubExtras & { index?: number }) {
	const { rest } = splitExtras(props);
	return <div {...rest} />;
}

export function InputOTPSeparator(props: ComponentProps<'div'> & StubExtras) {
	const { rest } = splitExtras(props);
	return <div {...rest} />;
}
