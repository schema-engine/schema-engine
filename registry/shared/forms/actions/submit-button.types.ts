import type { SubmitButtonConfig } from '@schema-engine/forms/elements';

export { SubmitButtonSchema } from '@schema-engine/forms/elements';
export type { SubmitButtonConfig } from '@schema-engine/forms/elements';

export type SubmitButtonProps = SubmitButtonConfig & {
	disabled?: boolean;
	onClick?: () => void;
};
