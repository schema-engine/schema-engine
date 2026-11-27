# Validation and issues

Writing rules, reading what a check found, and putting it into words. Timing (`validationMode`) is in `forms.md`; the issue and the formatter are defined in the router (`SKILL.md`).

## Rules

A rule is an object in an element's `rules`. Every rule takes `message` (the fallback text), `id` (the author's stable name, which becomes the issue's `ruleId`) and `severity` (`error`, the default, or `warning`). The built-in types are `required`, `minLength`, `maxLength`, `min`, `max`, `minItems`, `maxItems`, `pattern`, `email`, `phone`, `url`, `uuid`, `ipv4`, `ipv6`, `cidr`, `jwt`, `hash`, `base64`, `cuid`, `cuid2`, `ulid`, `hex`, `datetime`, `date`, `time`, plus `async` (asks an endpoint, through the engine's `fetch`) and `relate` (compares with another field). The property is `rules`, not `validation`.

Each built-in rule has a type and a Zod Mini schema named after it: `RequiredRule` and `RequiredRuleSchema`, `MinLengthRule`, `MaxLengthRule`, `MinRule`, `MaxRule`, `MinItemsRule`, `MaxItemsRule`, `PatternRule`, `EmailRule`, `PhoneRule`, `UrlRule`, `UuidRule`, `Ipv4Rule`, `Ipv6Rule`, `CidrRule`, `JwtRule`, `HashRule`, `Base64Rule`, `CuidRule`, `Cuid2Rule`, `UlidRule`, `HexRule`, `DateTimeRule` (the `datetime` rule), `DateRule`, `TimeRule`, `AsyncRule` and `RelateRule`, each with a schema of its own: `RequiredRuleSchema`, `MinLengthRuleSchema`, `MaxLengthRuleSchema`, `MinRuleSchema`, `MaxRuleSchema`, `MinItemsRuleSchema`, `MaxItemsRuleSchema`, `PatternRuleSchema`, `EmailRuleSchema`, `PhoneRuleSchema`, `UrlRuleSchema`, `UuidRuleSchema`, `Ipv4RuleSchema`, `Ipv6RuleSchema`, `CidrRuleSchema`, `JwtRuleSchema`, `HashRuleSchema`, `Base64RuleSchema`, `CuidRuleSchema`, `Cuid2RuleSchema`, `UlidRuleSchema`, `HexRuleSchema`, `DateTimeRuleSchema`, `DateRuleSchema`, `TimeRuleSchema`, `AsyncRuleSchema`, `RelateRuleSchema`. `ValidationRule` and `ValidationRuleSchema` are the union of them. `BaseValidationRule` and `BaseValidationRuleSchema` are the loose shape an element's `rules` accepts: the `$type` and the keys every rule has, and whatever its registration describes. `RelationAssert` is the `assert` of a `relate` rule: `allEqual`, `allDifferent`, `ascending`, `strictlyAscending`, `descending`, `strictlyDescending`, `atLeastOne`, `exactlyOne` or `allOrNone`. `ValidationPresets` builds rules in code, grouped by what they check (`ValidationPresets.string.required(message)`, `.number.min(value, message)`, and `array`, `network`, `date` and `boolean`).

The config in `forms.md` has a `required` rule with an `id`, an `email` rule with a `message` and a `warning` rule.

A rule reports one issue however many checks its schema runs. A `warning` goes to `warnings`, has the shape of an error and never changes `isValid`, `validate` or `checkValidity`. A custom rule is a registration passed as `validations` (`$type`, `schema`, `metadata`, `category`, `handler`). The handler returns the Zod Mini schema that checks the value; the issue's `type` is the rule's type and its `message` is the one the author wrote on the rule. The last `$type` wins, so a registration can replace a built-in rule. An element that extends `BaseFieldSchema` accepts a rule of any registered `$type` in its `rules`: the engine checks the rule against the registration's `schema` when it validates the form, and rejects a `$type` nothing registers, so there is nothing to widen. The registration's `schema` owns the rule's options, so one that replaces a built-in decides that rule's options, and the JSON Schema export lists each registered rule with them when its schema is Zod (by its `type` only otherwise).

A registry of rules outside an engine is built with `createValidationRegistry(registrations, { fetch? })` (`ValidationRegistryOptions`), or `createDefaultValidationRegistry` for the built-in rules followed by yours; the result is a `ValidationRegistry`, which `engine.getValidationRegistry()` returns. Besides the registry methods it has `check(rule)`, which resolves to a `RuleCheck`, `{ ok: true, rule }` with the rule as its registration parses it or `{ ok: false, issues }`, and `createSchema(rule, scope)`, which builds the schema of one rule and throws for an unregistered `$type` or a handler that throws. A handler receives a `ValidationContext`: `values`, `fieldPath`, `resolve(fieldRef)` (a bare name is a sibling, a dotted name is absolute), `debounceScope` and the engine's `fetch`. `createValidationContext(input?)` builds one from a `ValidationContextInput`, and `ValidationScope` is the context without `fetch`, which the registry supplies. `ValidationRegistrationConstraint` is what `createFormEngine({ validations })` accepts, so a `ValidationRegistration<PostalCodeRule>` fits. `getValidationRulesForElement(element, registry)` is an element's rules plus the `defaultFor` rules registered for its `$type`, and `isFieldRequired(rules)` is whether one of them is `required`. A rule's schema throws `ValidationSuperseded` when a later check replaced the one that started it, which is no verdict on the value, and `ValidationUnavailable` when the service it asks could not answer, which is no verdict either.

```ts title="forms/custom-rule.ts"
import * as z from 'zod/mini';
import { createFormEngine, defineInput, BaseFieldSchema, type ValidationRegistration } from '@schema-engine/forms';

type PostalCodeRule = { $type: 'postalCode'; message?: string };

export const postalCode: ValidationRegistration<PostalCodeRule> = {
	$type: 'postalCode',
	schema: z.looseObject({ $type: z.literal('postalCode') }),
	metadata: { name: 'Postal code' },
	category: 'string',
	handler: () => z.string().check(z.regex(/^\d{5}(?:-\d{4})?$/)),
};

const addressTextRegistration = defineInput({
	$type: 'text',
	schema: z.extend(BaseFieldSchema, { $type: z.literal('text') }),
	metadata: { name: 'Text', category: 'input' },
	value: () => z.string(),
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
				{ $type: 'text', name: 'postalCode', rules: [{ $type: 'postalCode', message: 'Enter a postal code' }] },
			],
		},
	],
});
```

## What an issue says

`type` names the problem for a program: a rule's type (`minLength`), a native flag (`typeMismatch`) or the server's code. `source` is `validation`, `native` or `server`. `ruleId` is the rule's `id`. `params` are the serializable numbers and names a text is built from (`{ minLength: 3 }`, under the constraint's own name). `message` is the author's, the server's or the control's text, and may be absent: the schema library's generic text is never used.

An error at a path is the issue to show plus `all`, a never-empty list in this order: what the server said, then each failing rule in authored order, then what the platform's own control reports. Errors are never inherited: an error on `contacts` is not an error on `contacts.0.email`. The form's own error is at `FORM_ROOT`.

## Native facts

A native control (`input`, `select`, `textarea`) also reports its own `validity` to the container as a fact of the path (`valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `tooLong`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `badInput`, and `customError` for a control a script made invalid with `setCustomValidity`), with the constraint as `params`. A fact is tied to the value it described, is dropped when that value changes, follows its row, and is counted by `validate` and `checkValidity`. A rule's error wins the display when both fail. How a control contributes one, or none, is in `forms-react-widgets.md` and `forms-radiant-widgets.md`.

A check of values outside a container returns `ValidationIssue`s, each with a `type`, `ruleId`, `params` and `message` and a `ValidationSeverity` (`error` blocks, `warning` only advises): `validateFormValues({ ... })` validates named fields of the steps and returns what each failed rule reported by dotted path, and `resolveParticipation` says which steps and paths take part and what each constraint says (a `Participation`, with a `FieldParticipation` per path and `foldFieldParticipation` folding in the ancestors). The steps it reads are `ValidationStep`s, whose elements are a `ValidationElementTree`.

The types of a container's issues: `FormStateIssue` (`type`, `source`, `ruleId?`, `params?`, `message?`), where `FormStateSource` is `server`, `validation` or `native`; `FormStateError` (the issue to show plus `all`) and `FormStateWarning`, the same shape and never blocking; `FormSubmissionIssue` (why a submission failed, with `source: 'submission'`); `FormStateErrorInput` and `FormStateErrorsInput`, what `setServerErrors` takes; `NativeValidity`, what a native control reports; `FormFieldState`, what is known about one field; `FormValidationMode` and `FormReValidateMode`, the timing values in `forms.md`; and `FormValidateResult` (`{ outcome }`, the verdict of a check). `issueText(issue, path, formatIssue)` is the text to show: what the formatter says, else the issue's own `message`, else nothing. `FormValidationIssue` and `FormValidationResult` are the issue and result of checking a form config, shaped like a Standard Schema issue with an optional `code` and `params`.

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
