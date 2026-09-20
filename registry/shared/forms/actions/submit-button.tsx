import { Button } from '@/components/ui/button';
import type { SubmitButtonProps } from './submit-button.types';
import { useFormContext } from '@schema-engine/forms-react/adapters';

export function SubmitButton({ label, disabled, onClick, className, ...config }: SubmitButtonProps) {
	const { formState } = useFormContext();
	const isSubmitting = formState?.isSubmitting;

	return (
		<Button
			type="submit"
			disabled={isSubmitting || disabled}
			aria-busy={isSubmitting}
			onClick={onClick}
			className={className}
			{...config}
		>
			{isSubmitting ? 'Submitting...' : label}
		</Button>
	);
}
