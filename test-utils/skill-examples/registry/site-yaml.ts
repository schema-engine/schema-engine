import * as z from 'zod/mini';
import { safeParseStandardSchema } from '@schema-engine/registry';
import { safeParseYaml, type YamlValidate } from '@schema-engine/registry/yaml';

const SiteSchema = z.object({ title: z.string(), port: z.number() });

const validateSite: YamlValidate<z.output<typeof SiteSchema>> = (value) => {
	const result = safeParseStandardSchema(SiteSchema, value);
	return result.success ? result : { success: false, issues: result.error.issues };
};

export function readSite(text: string) {
	return safeParseYaml(text, validateSite, { filename: 'site.yaml' });
}
