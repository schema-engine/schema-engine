import { codeToHtml } from 'shiki';

export const schemaConfigCode = `import { createReactFormComposer } from '@schema-engine/forms-react';
import {
  InputElementRegistration,
  TextareaElementRegistration,
  SubmitButtonElementRegistration,
  SubmissionAlertElementRegistration,
} from '@schema-engine/forms-react/registrations';

/**
 * One form engine per app. Build it once, reuse it everywhere.
 */
export const formEngine = createReactFormComposer()
  .addElement(InputElementRegistration)
  .addElement(TextareaElementRegistration)
  .addElement(SubmitButtonElementRegistration)
  .addElement(SubmissionAlertElementRegistration)
  .build();`;

export const contactFormConfigCode = `{
  "id": "contact-form",
  "title": "Contact Form",
  "mode": "free",
  "steps": [
    {
      "id": "contact-step",
      "elements": [
        {
          "$type": "submission-alert",
          "id": "status",
          "name": "status",
          "showOn": ["pending", "success"],
          "pendingMessage": "Pending Submission",
          "successMessage": "Submission Successful"
        },
        {
          "$type": "input",
          "id": "email",
          "name": "email",
          "inputType": "email",
          "label": "Email Address",
          "rules": [
            { "type": "required", "message": "Email is required" },
            { "type": "email", "message": "Please enter a valid email address" }
          ]
        },
        {
          "$type": "textarea",
          "id": "message",
          "name": "message",
          "label": "Message",
          "rules": [
            {
              "type": "minLength",
              "value": 10,
              "message": "Message must be at least 10 characters long"
            }
          ]
        },
        {
          "$type": "submit",
          "id": "submit",
          "name": "submit",
          "label": "Submit Form"
        }
      ]
    }
  ]
}`;

export const pageExampleCode = `import { FormEngineProvider, FormRenderer, rhfAdapter } from '@schema-engine/forms-react';
import { formEngine, contactFormConfig } from './schema.config';

const handleSubmit = (data: unknown) => {
  console.log('Contact form submitted', { data });
};

/**
 * Drop <FormRenderer /> anywhere in your React tree.
 * Same config, same form, every runtime.
 */
export function ContactFormPage() {
  return (
    <FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
      <FormRenderer config={contactFormConfig} onSubmit={handleSubmit} />
    </FormEngineProvider>
  );
}`;

export const schemaConfigExample = await codeToHtml(schemaConfigCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

export const contactFormConfigExample = await codeToHtml(contactFormConfigCode, {
	lang: 'json',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

export const pageExample = await codeToHtml(pageExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});
