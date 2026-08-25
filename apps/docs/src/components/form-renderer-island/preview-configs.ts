import type { FormConfig } from '@schema-engine/forms/schemas';
import { contactFormConfig } from '@/homepage/contact-form';
import { basicFormConfig } from '@/configs/forms/showcase-forms';
import { multiStepRegistrationConfig } from '@/configs/forms/multi-step-forms';
import { surveyFormConfig } from '@/configs/forms/survey-form';
import { simpleActionsFormConfig } from '@/configs/forms/actions-forms';

export const previewFormConfigs = {
	contact: contactFormConfig,
	basic: basicFormConfig,
	registration: multiStepRegistrationConfig,
	survey: surveyFormConfig,
	sequential: simpleActionsFormConfig,
} as const satisfies Record<string, FormConfig>;

export type PreviewId = keyof typeof previewFormConfigs;

export function isPreviewId(value: string): value is PreviewId {
	return value in previewFormConfigs;
}

export function getPreviewConfig(id: string): FormConfig | undefined {
	return isPreviewId(id) ? previewFormConfigs[id] : undefined;
}
