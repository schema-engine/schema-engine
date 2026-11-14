import { contactFormConfig } from '@/lib/form-configs/homepage-contact';
import { codeToHtmlSync } from '@/lib/sync-highlighter';
import { stringifyYaml } from '@schema-engine/registry/yaml';

export { contactFormConfig };

export const contactFormConfigExample = codeToHtmlSync(JSON.stringify(contactFormConfig, null, 2), 'json');
export const contactFormYamlExample = codeToHtmlSync(stringifyYaml(contactFormConfig), 'yaml');
