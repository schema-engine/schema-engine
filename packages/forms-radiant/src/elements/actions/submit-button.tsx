import { RuiButton } from '@ecopages/radiant-ui/button';
import { mergeControlProps } from '@schema-engine/forms';
import type { SubmitButtonProps } from './submit-button.types';

export function SubmitButton({ label, disabled, onClick, className, id, name, htmlAttributes }: SubmitButtonProps) {
	return (
		<RuiButton
			{...mergeControlProps({ type: 'submit' as const, disabled, class: className, id, name }, htmlAttributes)}
			on:click={onClick}
		>
			{label}
		</RuiButton>
	);
}
