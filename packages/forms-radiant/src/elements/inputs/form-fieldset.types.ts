import type { ElementRenderProps } from '@schema-engine/forms';
import type { FieldSetConfigSchema } from '@schema-engine/forms/default-elements';

export { FieldSetConfigSchema } from '@schema-engine/forms/default-elements';
export type { FieldSetConfig, FieldSetInput } from '@schema-engine/forms/default-elements';

export type FieldSetProps = ElementRenderProps<typeof FieldSetConfigSchema>;
