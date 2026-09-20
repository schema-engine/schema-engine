import { RuiButton } from '@ecopages/radiant-ui/button';
import type { SubmitButtonProps } from './submit-button.types';

export function SubmitButton({ label, disabled, onClick, className }: SubmitButtonProps) {
	return (
		<RuiButton type="submit" disabled={disabled} class={className} on:click={onClick}>
			{label}
		</RuiButton>
	);
}
