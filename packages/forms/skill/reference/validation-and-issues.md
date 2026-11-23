# Validation and issues

Writing rules, reading what a check found, and putting it into words. Timing (`validationMode`) is in `forms.md`; the issue and the formatter are defined in `SKILL.md`.

## Rules

A rule is an object in an element's `rules`. Every rule takes `message` (the fallback text), `id` (the author's stable name, which becomes the issue's `ruleId`) and `severity` (`error`, the default, or `warning`). The built-in types are `required`, `minLength`, `maxLength`, `min`, `max`, `minItems`, `maxItems`, `pattern`, `email`, `phone`, `url`, `uuid`, `ipv4`, `ipv6`, `cidr`, `jwt`, `hash`, `base64`, `cuid`, `cuid2`, `ulid`, `hex`, `datetime`, `date`, `time`, plus `async` (asks an endpoint, through the engine's `fetch`) and `relate` (compares with another field). The property is `rules`, not `validation`.

The config in `forms.md` has a `required` rule with an `id`, an `email` rule with a `message` and a `warning` rule.

A rule reports one issue however many checks its schema runs. A `warning` goes to `warnings`, has the shape of an error and never changes `isValid`, `validate` or `checkValidity`. A custom rule is a registration passed as `validations` (`$type`, `schema`, `metadata`, `category`, `handler`). The handler returns the Zod Mini schema that checks the value; the issue's `type` is the rule's type and its `message` is the one the author wrote on the rule. The last `$type` wins, so a registration can replace a built-in rule. `BaseFieldSchema` types `rules` as the built-in rules only, so an element that accepts a custom rule widens its `rules` with `BaseValidationRuleSchema`, as below.

```ts title="forms/custom-rule.ts"
import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';
import { BaseFieldSchema } from '@schema-engine/forms/schemas';
import { BaseValidationRuleSchema, type ValidationRegistration } from '@schema-engine/forms/schemas/validation';

type PostalCodeRule = { type: 'postalCode'; message?: string };

export const postalCode: ValidationRegistration<PostalCodeRule> = {
	$type: 'postalCode',
	schema: z.looseObject({ type: z.literal('postalCode') }),
	metadata: { name: 'Postal code' },
	category: 'string',
	handler: () => z.string().check(z.regex(/^\d{5}(?:-\d{4})?$/)),
};

const addressTextRegistration = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, {
		$type: z.literal('text'),
		rules: z.optional(z.array(BaseValidationRuleSchema)),
	}),
	metadata: { name: 'Text', category: 'input' },
	render: () => null,
});

export const addressEngine = createFormEngine({ elements: [addressTextRegistration], validations: [postalCode] });

export const addressForm = addressEngine.defineForm({
	id: 'address',
	steps: [
		{
			id: 'main',
			title: 'Address',
			elements: [
				{ $type: 'text', name: 'postalCode', rules: [{ type: 'postalCode', message: 'Enter a postal code' }] },
			],
		},
	],
});
```

## What an issue says

`type` names the problem for a program: a rule's type (`minLength`), a native flag (`typeMismatch`) or the server's code. `source` is `validation`, `native` or `server`. `ruleId` is the rule's `id`. `params` are the serializable numbers and names a text is built from (`{ minLength: 3 }`, under the constraint's own name). `message` is the author's, the server's or the control's text, and may be absent: the schema library's generic text is never used.

An error at a path is the issue to show plus `all`, a never-empty list in this order: what the server said, then each failing rule in authored order, then what the platform's own control reports. Errors are never inherited: an error on `contacts` is not an error on `contacts.0.email`. The form's own error is at `FORM_ROOT`.

## Native facts

A native control (`input`, `select`, `textarea`) also reports its own `validity` to the container as a fact of the path (`valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `tooLong`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `badInput`, and `customError` for a control a script made invalid with `setCustomValidity`), with the constraint as `params`. A fact is tied to the value it described, is dropped when that value changes, follows its row, and is counted by `validate` and `checkValidity`. A rule's error wins the display when both fail. How a control contributes one, or none, is in `widgets.md`.

## Words and translation

The formatter is one function, `FormIssueFormatter = (issue, { path }) => string`. `ruleId` picks the text of one rule, `type` the text of a kind of rule, and `params` fill its numbers. Return an empty string when you have nothing to say and the issue's own `message` is shown. The same formatter words submission failures, with `FORM_ROOT` as the path. It is set once on the engine, and a renderer (`FormRenderer` in React, the instance in Radiant) may override it for one form.

```ts title="forms/format-issue.ts"
import { createFormEngine } from '@schema-engine/forms';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import { textRegistration } from './engine';

type Text = (params: Readonly<Record<string, unknown>>) => string;

const byRuleId: Record<string, Text> = {
	'name-required': () => 'Tell us your name',
};

const byType: Record<string, Text> = {
	required: () => 'This field is required',
	minLength: ({ minLength }) => `Use at least ${String(minLength)} characters`,
	taken: () => 'Already taken',
};

export const formatIssue: FormIssueFormatter = (issue) => {
	const ruleId = issue.source === 'submission' ? undefined : issue.ruleId;
	const text = byRuleId[ruleId ?? ''] ?? byType[issue.type];
	return text?.(issue.params ?? {}) ?? '';
};

export const localizedEngine = createFormEngine({ elements: [textRegistration], formatIssue });
```

A field can be `invalid` with no text to show, when nothing says what is wrong in words, so a widget marks itself invalid from the flag and not from the text.
