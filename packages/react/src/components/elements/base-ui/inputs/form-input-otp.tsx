import { FieldGroup } from '@/components/elements/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/base-ui/input-otp';
import type { InputOTPFieldProps } from './form-input-otp.types';

export function FormInputOTP({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: InputOTPFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const otpValue = String(value || '');
	const length = config.length || 6;
	const firstHalf = Math.ceil(length / 2);
	const secondHalf = length - firstHalf;

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isRequired}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<InputOTP
				{...fieldProps}
				maxLength={length}
				value={otpValue}
				onChange={combineHandlers(onChange, propsOnChange)}
				onBlur={combineHandlers(onBlur, propsOnBlur)}
				onFocus={propsOnFocus}
				disabled={fieldProps.disabled}
				autoFocus={config.autoFocus}
			>
				<InputOTPGroup>
					{Array.from({ length: firstHalf }).map((_, i) => (
						<InputOTPSlot
							key={i}
							index={i}
							className="border border-gray-300 rounded-md w-10 h-10 text-center"
						/>
					))}
				</InputOTPGroup>
				<InputOTPSeparator />
				<InputOTPGroup>
					{Array.from({ length: secondHalf }).map((_, i) => (
						<InputOTPSlot
							key={i}
							index={i + firstHalf}
							className="border border-gray-300 rounded-md w-10 h-10 text-center"
						/>
					))}
				</InputOTPGroup>
			</InputOTP>
		</FieldGroup>
	);
}
