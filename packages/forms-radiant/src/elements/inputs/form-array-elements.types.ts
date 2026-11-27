import type { ElementRenderProps } from '@schema-engine/forms';
import type { ArrayElementConfigSchema } from '@schema-engine/forms/default-elements';

export { ArrayElementConfigSchema } from '@schema-engine/forms/default-elements';
export type { ArrayElementsConfig, ArrayElementsInput } from '@schema-engine/forms/default-elements';

export type ArrayElementsProps = ElementRenderProps<
	typeof ArrayElementConfigSchema,
	{
		ssrInitialRows?: readonly unknown[];
		/** The ids the server's container gave the rows it rendered, from the hydration the form instance serializes. */
		ssrRowIds?: readonly string[];
		initialFormValues?: Record<string, unknown>;
	}
>;
