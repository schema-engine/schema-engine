import { contactFormConfig } from '@/lib/form-configs/homepage-contact';
import { highlightToHtml } from '@/lib/pierre-highlight';
import { stringifyYaml } from '@schema-engine/registry/yaml';

export { contactFormConfig };

export const contactFormConfigExample = highlightToHtml(JSON.stringify(contactFormConfig, null, 2), 'json');
export const contactFormYamlExample = highlightToHtml(stringifyYaml(contactFormConfig), 'yaml');
