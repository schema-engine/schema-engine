import type React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FieldErrorProps extends React.ComponentProps<'p'> {}

export function FieldError({ className, ...props }: FieldErrorProps) {
	return (
		<p
			role="alert"
			data-slot="field-error"
			className={cn('text-sm font-normal text-destructive', className)}
			{...props}
		/>
	);
}

interface FieldDescriptionProps extends React.ComponentProps<'p'> {}

export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
	return (
		<p
			data-slot="field-description"
			className={cn('text-sm font-normal text-muted-foreground', className)}
			{...props}
		/>
	);
}

interface FieldRequiredIndicatorProps extends React.ComponentProps<'span'> {}

export function FieldRequiredIndicator({ className, ...props }: FieldRequiredIndicatorProps) {
	return (
		<span className={cn('text-destructive', className)} {...props}>
			*
		</span>
	);
}

interface FieldLabelProps extends React.ComponentProps<typeof Label> {
	htmlFor?: string;
	hiddenLabel?: boolean;
	required?: boolean;
	error?: string;
	errorLabelColor?: boolean;
}

export function FieldLabel({
	htmlFor,
	hiddenLabel = false,
	required = false,
	error,
	errorLabelColor = false,
	children,
	className,
	...props
}: FieldLabelProps) {
	const hasError = !!error;

	return (
		<Label
			htmlFor={htmlFor}
			data-error={hasError}
			data-slot="field-label"
			className={cn(
				'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
				hiddenLabel && 'sr-only',
				hasError && 'text-destructive',
				errorLabelColor && 'data-[error=true]:text-destructive',
				className,
			)}
			{...props}
		>
			{children}
			{required && <FieldRequiredIndicator />}
		</Label>
	);
}

interface FieldMessageProps extends React.ComponentProps<'p'> {
	type?: 'error' | 'description';
}

export function FieldMessage({ type = 'description', className, ...props }: FieldMessageProps) {
	const isError = type === 'error';

	return isError ? (
		<FieldError className={className} {...props} />
	) : (
		<FieldDescription className={className} {...props} />
	);
}

interface FieldHintProps extends React.ComponentProps<'div'> {
	error?: string;
	description?: string;
	display?: 'alternate' | 'both';
}

export function FieldHint({ error, description, display = 'alternate', className, ...props }: FieldHintProps) {
	const hasError = !!error;
	const hasDescription = !!description;

	if (!hasError && !hasDescription) {
		return null;
	}

	if (display === 'alternate') {
		return (
			<div className={cn('flex flex-col gap-1', className)} data-slot="field-hint" {...props}>
				{hasError ? (
					<FieldError>{error}</FieldError>
				) : hasDescription ? (
					<FieldDescription>{description}</FieldDescription>
				) : null}
			</div>
		);
	}

	if (display === 'both') {
		return (
			<div className={cn('flex flex-col gap-1', className)} data-slot="field-hint" {...props}>
				{hasDescription && <FieldDescription>{description}</FieldDescription>}
				{hasError && <FieldError>{error}</FieldError>}
			</div>
		);
	}

	return null;
}

interface FieldGroupRootProps extends React.ComponentProps<'div'> {
	hasError?: boolean;
}

export function FieldGroupRoot({ className, hasError, ...props }: FieldGroupRootProps) {
	return (
		<div
			className={cn('space-y-2', className)}
			data-slot="field-group-root"
			data-error={hasError ? 'true' : 'false'}
			{...props}
		/>
	);
}

interface FieldInputContainerProps extends React.ComponentProps<'div'> {}

export function FieldInputContainer({ className, ...props }: FieldInputContainerProps) {
	return (
		<div className={cn('flex items-center space-x-2', className)} data-slot="field-input-container" {...props} />
	);
}

interface FieldContentProps extends React.ComponentProps<'div'> {}

export function FieldContent({ className, ...props }: FieldContentProps) {
	return <div className={cn('space-y-1', className)} data-slot="field-content" {...props} />;
}

interface FieldGroupProps {
	label: string;
	htmlFor?: string;
	hiddenLabel?: boolean;
	required?: boolean;
	description?: string;
	error?: string;
	className?: string;
	children: React.ReactNode;
	style?: React.CSSProperties;
	errorLabelColor?: boolean;
	showDescriptionWithError?: boolean;
}

export function FieldGroup({
	label,
	htmlFor,
	hiddenLabel = false,
	required = false,
	description,
	error,
	className,
	children,
	style,
	errorLabelColor = false,
	showDescriptionWithError = false,
}: FieldGroupProps) {
	const display = showDescriptionWithError ? 'both' : 'alternate';
	const hasError = !!error;

	return (
		<FieldGroupRoot className={className} style={style} hasError={hasError}>
			<FieldLabel
				htmlFor={htmlFor}
				hiddenLabel={hiddenLabel}
				required={required}
				error={error}
				errorLabelColor={errorLabelColor}
			>
				{label}
			</FieldLabel>
			<FieldContent>
				{children}
				<FieldHint error={error} description={description} display={display} />
			</FieldContent>
		</FieldGroupRoot>
	);
}

interface FieldSetProps extends React.ComponentProps<'fieldset'> {
	legend?: string;
	description?: string;
	children: React.ReactNode;
}

export function FieldSet({ legend, description, className, children, ...props }: FieldSetProps) {
	return (
		<fieldset className={cn('border-0 p-0 m-0', className)} {...props}>
			{legend && (
				<legend className="text-base font-semibold mb-8 pb-3 border-b border-border w-full">
					{legend}
					{description && (
						<span className="block text-sm font-normal text-muted-foreground mt-1">{description}</span>
					)}
				</legend>
			)}
			{children}
		</fieldset>
	);
}
