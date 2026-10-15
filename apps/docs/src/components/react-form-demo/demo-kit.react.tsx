/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { useControlledFormElement } from '@schema-engine/forms-react/hooks';

/**
 * Radiant-styled field chrome for docs demos.
 *
 * @remarks
 * Mirrors the DOM structure and `rui-*` classes of radiant-ui so the docs app's
 * global `@ecopages/radiant-ui/styles.css` styles the demo controls. Controls
 * stamp `data-rui-control` for the shared field-control contract.
 */
function DemoField({
	label,
	htmlFor,
	description,
	error,
	required = false,
	style,
	children,
}: {
	label: string;
	htmlFor?: string;
	description?: string;
	error?: string | null;
	required?: boolean;
	style?: React.CSSProperties;
	children: ReactNode;
}) {
	return (
		<div className="rui-field" data-ref="field" style={style}>
			<label className="rui-label" htmlFor={htmlFor}>
				{label}
				{required ? ' *' : ''}
			</label>
			{children}
			{description ? <p className="rui-field__description">{description}</p> : null}
			<p className="rui-field__error" role="alert" hidden={!error}>
				{error}
			</p>
		</div>
	);
}

export function DemoInput({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: Record<string, unknown> & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
}) {
	const {
		value,
		error,
		onChange: setValue,
		onBlur,
		fieldProps,
		isRequired,
		containerStyles,
	} = useControlledFormElement(config as never);
	const { inputType = 'text', placeholder } = config as { inputType?: string; placeholder?: string };

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			required={isRequired}
			style={containerStyles}
		>
			<input
				{...fieldProps}
				className="rui-input"
				type={inputType}
				placeholder={placeholder}
				value={(value as string) ?? ''}
				onChange={(event) => {
					setValue(event.target.value);
					(propsOnChange as ((value: string) => void) | undefined)?.(event.target.value);
				}}
				onBlur={() => {
					onBlur();
					propsOnBlur?.();
				}}
			/>
		</DemoField>
	);
}

export function DemoTextarea({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: Record<string, unknown> & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
}) {
	const {
		value,
		error,
		onChange: setValue,
		onBlur,
		fieldProps,
		containerStyles,
	} = useControlledFormElement(config as never);
	const rows = (config.rows as number | undefined) ?? 5;

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			style={containerStyles}
		>
			<textarea
				{...fieldProps}
				className="rui-textarea"
				rows={rows}
				placeholder={config.placeholder as string}
				value={(value as string) ?? ''}
				onChange={(event) => {
					setValue(event.target.value);
					(propsOnChange as ((value: string) => void) | undefined)?.(event.target.value);
				}}
				onBlur={() => {
					onBlur();
					propsOnBlur?.();
				}}
			/>
		</DemoField>
	);
}

export function DemoSelect({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: Record<string, unknown> & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
}) {
	const {
		value,
		error,
		onChange: setValue,
		onBlur,
		fieldProps,
		containerStyles,
	} = useControlledFormElement(config as never);
	const options = ((config.options as Array<{ value: unknown; label: string; disabled?: boolean }>) ?? []).map(
		(option) => ({ value: String(option.value), label: option.label, disabled: option.disabled }),
	);

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			style={containerStyles}
		>
			<select
				{...fieldProps}
				className="rui-input"
				value={(value as string) ?? ''}
				onChange={(event) => {
					setValue(event.target.value);
					(propsOnChange as ((value: string) => void) | undefined)?.(event.target.value);
				}}
				onBlur={() => {
					onBlur();
					propsOnBlur?.();
				}}
			>
				<option value="">{(config.placeholder as string) ?? 'Select an option'}</option>
				{options.map((option) => (
					<option key={option.value} value={option.value} disabled={option.disabled}>
						{option.label}
					</option>
				))}
			</select>
		</DemoField>
	);
}

export function DemoCheckbox({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	...config
}: Record<string, unknown> & {
	onChange?: (value: boolean) => void;
	onBlur?: () => void;
}) {
	const {
		value,
		error,
		onChange: setValue,
		onBlur,
		fieldProps,
		containerStyles,
	} = useControlledFormElement(config as never);

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			style={containerStyles}
		>
			<label className="rui-checkbox">
				<input
					{...fieldProps}
					type="checkbox"
					className="rui-checkbox__input"
					data-rui-control-type="boolean"
					checked={Boolean(value)}
					onChange={(event) => {
						setValue(event.target.checked);
						(propsOnChange as ((value: boolean) => void) | undefined)?.(event.target.checked);
					}}
					onBlur={() => {
						onBlur();
						propsOnBlur?.();
					}}
				/>
				<span className="rui-checkbox__control" aria-hidden="true" />
				<span className="rui-checkbox__label">{(config.checkLabel as string) ?? 'Yes'}</span>
			</label>
		</DemoField>
	);
}

export function DemoSubmit(config: Record<string, unknown> & { onClick?: () => void; disabled?: boolean }) {
	return (
		<button
			type="submit"
			className="rui-button rui-button--filled rui-button--md"
			disabled={config.disabled}
			onClick={config.onClick}
		>
			{(config.label as string) ?? 'Submit'}
		</button>
	);
}
