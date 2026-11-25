import { SubmitButtonElementRegistration } from '@/generated/shadcn/components/schema-engine/forms/actions/submit-button.registration';
import { InputElementRegistration } from '@/generated/shadcn/components/schema-engine/forms/inputs/form-input.registration';
import { SelectElementRegistration } from '@/generated/shadcn/components/schema-engine/forms/inputs/form-select.registration';
import { SwitchElementRegistration } from '@/generated/shadcn/components/schema-engine/forms/inputs/form-switch.registration';
import { TextareaElementRegistration } from '@/generated/shadcn/components/schema-engine/forms/inputs/form-textarea.registration';

/**
 * The registration barrel that installing the shadcn registry leaves in an app, for the fields the docs copy.
 *
 * @remarks
 * The Examples import it as `@/components/schema-engine/forms/registrations`, the path of that barrel in an app, and
 * their pages do not show it, as they do not show the components it lists. The vitest aliases and the `paths` of
 * `tsconfig.json` point that specifier here, to the copy under `src/generated/shadcn` that
 * `scripts/copy-registry-demo.ts` writes. The real barrel lists every element of the registry; this one lists the
 * five the examples and the guide use, so an example that needs another field has to add it here and to that script.
 */
export {
	InputElementRegistration,
	SelectElementRegistration,
	SubmitButtonElementRegistration,
	SwitchElementRegistration,
	TextareaElementRegistration,
};

export const schemaFormRegistrations = [
	SubmitButtonElementRegistration,
	TextareaElementRegistration,
	SwitchElementRegistration,
	SelectElementRegistration,
	InputElementRegistration,
] as const;
