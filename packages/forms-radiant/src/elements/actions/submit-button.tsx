import '@ecopages/radiant-ui/button/styles.css';
import { RuiButton } from '@ecopages/radiant-ui/button';
import type { SubmitButtonProps } from '@/registry/forms/actions/submit-button.types';

export function SubmitButton({ label = 'Submit', disabled, onClick, className }: SubmitButtonProps) {
	return (
		<RuiButton type="submit" disabled={disabled} class={className} on:click={onClick}>
			{label}
		</RuiButton>
	);
}
