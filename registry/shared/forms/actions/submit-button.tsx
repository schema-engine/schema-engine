import { Button } from '@/components/ui/button';
import { useFormContext } from '@schema-engine/forms-react/hooks';
import { isSubmissionBusy, mergeControlProps } from '@schema-engine/forms';
import type { SubmitButtonProps } from './submit-button.types';

export function SubmitButton({ label, disabled, onClick, className, id, name, htmlAttributes }: SubmitButtonProps) {
	const { formState } = useFormContext();
	const isSubmitting = isSubmissionBusy(formState.submission.status);

	return (
		<Button
			data-se-control
			{...mergeControlProps(
				{
					type: 'submit' as const,
					disabled: isSubmitting || disabled,
					'aria-busy': isSubmitting,
					className,
					id,
					name,
				},
				htmlAttributes,
			)}
			onClick={onClick}
		>
			{isSubmitting ? 'Submitting...' : label}
		</Button>
	);
}
