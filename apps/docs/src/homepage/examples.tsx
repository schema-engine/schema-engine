import { contactFormConfig } from '@/lib/form-configs/homepage-contact';
import { codeToHtmlSync } from '@/lib/sync-highlighter';

export { contactFormConfig };

export const contactFormConfigExample = codeToHtmlSync(JSON.stringify(contactFormConfig, null, 2), 'json');
