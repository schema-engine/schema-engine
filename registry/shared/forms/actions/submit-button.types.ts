import type { SubmitButtonConfig } from '@schema-engine/forms/default-elements';

export { SubmitButtonSchema } from '@schema-engine/forms/default-elements';
export type { SubmitButtonConfig } from '@schema-engine/forms/default-elements';

export type SubmitButtonProps = SubmitButtonConfig & {
	disabled?: boolean;
	onClick?: () => void;
};
