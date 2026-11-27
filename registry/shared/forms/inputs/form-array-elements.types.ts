import type { ElementRenderProps } from '@schema-engine/forms';
import type { ArrayElementConfigSchema } from '@schema-engine/forms/default-elements';

export { ArrayElementConfigSchema } from '@schema-engine/forms/default-elements';
export type { ArrayElementsConfig, ArrayElementsInput } from '@schema-engine/forms/default-elements';

export type ArrayElementsProps = ElementRenderProps<
	typeof ArrayElementConfigSchema,
	{
		onChange?: (value: unknown) => void;
		onBlur?: () => void;
		onFocus?: () => void;
	}
>;
