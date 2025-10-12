import { Button } from '@/shadcn/ui/button';
import type { SubmitButtonProps } from './submit-button.types';
import { useFormContext } from '@/adapters';

export function SubmitButton({ label = 'Submit', disabled, onClick, ...config }: SubmitButtonProps) {
	const { formState } = useFormContext();
	const isSubmitting = formState?.isSubmitting;

	return (
		<Button
			type="submit"
			disabled={isSubmitting || disabled}
			aria-busy={isSubmitting}
			onClick={onClick}
			{...config}
		>
			{isSubmitting ? 'Submitting...' : label}
		</Button>
	);
}
