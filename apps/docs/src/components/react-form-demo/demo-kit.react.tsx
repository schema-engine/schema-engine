/** @jsxImportSource react */
import type { ReactNode } from 'react';
import type { ElementConfig } from '@schema-engine/forms';
import type { ElementGridConfig } from '@schema-engine/layout';
import { fieldText, useFormField, useFieldHost } from '@schema-engine/forms-react/hooks';

/**
 * Radiant-styled field chrome for docs demos.
 *
 * @remarks
 * Mirrors the DOM structure and `rui-*` classes of radiant-ui so the docs app's
 * global `@ecopages/radiant-ui/styles.css` styles the demo controls. Controls
 * stamp `data-rui-control` for the shared field-control contract. The field host comes from
 * `useFieldHost`, so `grid` placement and `appearance` reach the demos as they do the registry fields.
 */
function DemoField({
	label,
	htmlFor,
	description,
	error,
	required = false,
	grid,
	style,
	children,
}: {
	label: string;
	htmlFor?: string;
	description?: string;
	error?: string | null;
	required?: boolean;
	grid?: ElementGridConfig;
	style?: React.CSSProperties;
	children: ReactNode;
}) {
	const host = useFieldHost(grid, style);
	return (
		<div {...host} className={`rui-field ${host.className}`} data-ref="field">
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
}: ElementConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
}) {
	const { defaultValue, error, fieldProps, required } = useFormField(config);
	const { inputType = 'text', placeholder } = config as { inputType?: string; placeholder?: string };

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			required={required}
			grid={config.grid as ElementGridConfig | undefined}
			style={config.style as React.CSSProperties | undefined}
		>
			<input
				{...fieldProps}
				className="rui-input"
				type={inputType}
				placeholder={placeholder}
				defaultValue={fieldText(defaultValue)}
				onChange={(event) => {
					fieldProps.onChange(event);
					propsOnChange?.(event.target.value);
				}}
				onBlur={() => {
					fieldProps.onBlur();
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
}: ElementConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
}) {
	const { defaultValue, error, fieldProps } = useFormField(config);
	const rows = (config.rows as number | undefined) ?? 5;

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			grid={config.grid as ElementGridConfig | undefined}
			style={config.style as React.CSSProperties | undefined}
		>
			<textarea
				{...fieldProps}
				className="rui-textarea"
				rows={rows}
				placeholder={config.placeholder as string}
				defaultValue={fieldText(defaultValue)}
				onChange={(event) => {
					fieldProps.onChange(event);
					propsOnChange?.(event.target.value);
				}}
				onBlur={() => {
					fieldProps.onBlur();
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
}: ElementConfig & {
	onChange?: (value: string) => void;
	onBlur?: () => void;
}) {
	const { defaultValue, error, fieldProps } = useFormField(config);
	const options = ((config.options as Array<{ value: unknown; label: string; disabled?: boolean }>) ?? []).map(
		(option) => ({ value: String(option.value), label: option.label, disabled: option.disabled }),
	);

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			grid={config.grid as ElementGridConfig | undefined}
			style={config.style as React.CSSProperties | undefined}
		>
			<select
				{...fieldProps}
				className="rui-input"
				defaultValue={fieldText(defaultValue)}
				onChange={(event) => {
					fieldProps.onChange(event);
					propsOnChange?.(event.target.value);
				}}
				onBlur={() => {
					fieldProps.onBlur();
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
}: ElementConfig & {
	onChange?: (value: boolean) => void;
	onBlur?: () => void;
}) {
	const { defaultValue, error, fieldProps } = useFormField(config);

	return (
		<DemoField
			label={(config.label as string) || (config.name as string)}
			htmlFor={config.id as string}
			description={config.description as string}
			error={error}
			grid={config.grid as ElementGridConfig | undefined}
			style={config.style as React.CSSProperties | undefined}
		>
			<label className="rui-checkbox">
				<input
					{...fieldProps}
					type="checkbox"
					className="rui-checkbox__input"
					data-rui-control-type="boolean"
					defaultChecked={Boolean(defaultValue)}
					onChange={(event) => {
						fieldProps.onChange(event);
						propsOnChange?.(event.target.checked);
					}}
					onBlur={() => {
						fieldProps.onBlur();
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
