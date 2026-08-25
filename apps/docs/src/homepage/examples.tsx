import { codeToHtml } from 'shiki';
import { contactFormConfig } from './contact-form';

export { contactFormConfig };

export const contactFormConfigExample = await codeToHtml(JSON.stringify(contactFormConfig, null, 2), {
	lang: 'json',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});
