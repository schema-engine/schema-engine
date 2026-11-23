import * as z from 'zod/mini';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { ElementGridConfig, LayoutInput } from '@schema-engine/layout';
import { useFormField } from '@/hooks/form-state';
import { useLayoutThemeId } from '@/hooks/use-form-context';
import { createFormEngine } from '@schema-engine/forms';
import {
	SSR_WIDTH_FIELDS,
	ssrAreasForm,
	ssrNestedFields,
	ssrSteppedForm,
} from '../../../../test-utils/ssr-grid-acceptance';
import { ArrayElementRegistration } from '@/components/schema-engine/forms/inputs/form-array-elements.registration';
import { FieldSetRegistration } from '@/components/schema-engine/forms/inputs/form-fieldset.registration';
import { anyValue } from '../utils/any-value';

const ssrInputSchema = z.object({
	$type: z.literal('ssr-input'),
	id: z.string(),
	name: z.string(),
	label: z.optional(z.string()),
	grid: z.optional(z.custom<ElementGridConfig>()),
});

type SsrInputConfig = z.infer<typeof ssrInputSchema>;

function SsrFixtureInput(config: SsrInputConfig) {
	const { containerStyles } = useFormField(config);
	const layoutThemeId = useLayoutThemeId();
	const label = config.label ?? config.name;

	return (
		<div className="se-form-field se-grid-item" data-se-theme={layoutThemeId} style={containerStyles}>
			<label htmlFor={config.id}>{label}</label>
			<input id={config.id} name={config.name} aria-label={label} readOnly />
		</div>
	);
}

/** The fixture engine; pass `layout` to put it on a shared or customised layout theme. */
export function createSsrAcceptanceEngine<const TLayout extends LayoutInput = Record<never, never>>(layout?: TLayout) {
	return createFormEngine({
		layout,
		elements: [
			FieldSetRegistration,
			ArrayElementRegistration,
			{
				$type: 'ssr-input',
				kind: 'input',
				value: anyValue,
				schema: ssrInputSchema,
				metadata: { name: 'SSR input', category: 'input' },
				render: (config: SsrInputConfig) => <SsrFixtureInput {...config} />,
			},
		],
	});
}

let cachedFixture:
	| {
			engine: FormEngine;
			config: NormalizedFormConfig;
	  }
	| undefined;

export function getSsrAcceptanceFixture() {
	if (!cachedFixture) {
		const engine = createSsrAcceptanceEngine();
		const config = engine.validateForm({
			id: 'ssr-layout-acceptance',
			title: 'SSR layout acceptance',
			grid: {
				columns: 1,
				responsive: { sm: { columns: 2 } },
			},
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{
							$type: 'ssr-input',
							id: 'tracked',
							name: 'tracked',
							label: 'Tracked field',
							grid: {
								column: 'span 1',
								responsive: { md: { column: 'span 2', hidden: true } },
							},
						},
						{
							$type: 'ssr-input',
							id: 'visible',
							name: 'visible',
							label: 'Visible field',
						},
					],
				},
			],
		});
		cachedFixture = { engine, config };
	}
	return cachedFixture;
}

let cachedWidthsFixture: ReturnType<typeof getSsrAcceptanceFixture> | undefined;

/** Same engine as {@link getSsrAcceptanceFixture}, with a form that places fields by named width. */
export function getSsrWidthsFixture() {
	if (!cachedWidthsFixture) {
		const { engine } = getSsrAcceptanceFixture();
		const config = engine.validateForm({
			id: 'ssr-widths-acceptance',
			title: 'SSR widths acceptance',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: SSR_WIDTH_FIELDS.map(({ id, label, grid }) => ({
						$type: 'ssr-input',
						id,
						name: id,
						label,
						grid,
					})),
				},
			],
		});
		cachedWidthsFixture = { engine, config };
	}
	return cachedWidthsFixture;
}

let cachedNestedFixture: ReturnType<typeof getSsrAcceptanceFixture> | undefined;

/** Same engine, with a fieldset and an array row whose children set widths. */
export function getSsrNestedWidthsFixture() {
	if (!cachedNestedFixture) {
		const { engine } = getSsrAcceptanceFixture();
		const children = (prefix: 'Nest' | 'Row') =>
			ssrNestedFields(prefix).map(({ id, label, grid }) => ({ $type: 'ssr-input', id, name: id, label, grid }));
		const config = engine.validateForm({
			id: 'ssr-nested-widths-acceptance',
			title: 'SSR nested widths acceptance',
			steps: [
				{
					id: 'main',
					title: 'Main',
					elements: [
						{ $type: 'fieldSet', id: 'group', name: 'group', legend: 'Group', elements: children('Nest') },
						{
							$type: 'arrayElements',
							id: 'rows',
							name: 'rows',
							label: 'Rows',
							minItems: 1,
							elements: children('Row'),
						},
					],
				},
			],
		});
		cachedNestedFixture = { engine, config };
	}
	return cachedNestedFixture;
}

/** Same engine as {@link getSsrAcceptanceFixture}, with a step grid that draws its layout from areas. */
export function getSsrAreasFixture() {
	const { engine } = getSsrAcceptanceFixture();
	return { engine, config: engine.validateForm(ssrAreasForm('ssr-input')) };
}

/** Same engine, with a step that draws its own responsive template beside a step on the form grid. */
export function getSsrSteppedFixture() {
	const { engine } = getSsrAcceptanceFixture();
	return { engine, config: engine.validateForm(ssrSteppedForm('ssr-input')) };
}
