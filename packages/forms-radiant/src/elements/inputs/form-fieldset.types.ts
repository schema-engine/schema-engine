import type { ElementRenderProps } from '@schema-engine/forms';
import type { FieldSetConfigSchema } from '@schema-engine/forms/elements';

export { FieldSetConfigSchema } from '@schema-engine/forms/elements';
export type { FieldSetConfig, FieldSetInput } from '@schema-engine/forms/elements';

export type FieldSetProps = ElementRenderProps<typeof FieldSetConfigSchema>;
