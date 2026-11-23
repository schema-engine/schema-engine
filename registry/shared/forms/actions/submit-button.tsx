import { Button } from '@/components/ui/button';
import { useFormContext } from '@schema-engine/forms-react/hooks';
import { mergeControlProps } from '@schema-engine/forms/schemas/html-attributes';
import type { SubmitButtonProps } from './submit-button.types';

export function SubmitButton({ label, disabled, onClick, className, id, name, htmlAttributes }: SubmitButtonProps) {
	const { formState } = useFormContext();
	const isSubmitting = formState.submission.status === 'pending';

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
