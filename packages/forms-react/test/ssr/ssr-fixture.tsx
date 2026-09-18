import * as z from 'zod/mini';
import type { NormalizedFormConfig } from '@schema-engine/forms';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { ElementGridConfig } from '@schema-engine/forms/schemas';
import { rhfAdapter } from '@/adapters/react-hook-form';
import { useControlledFormElement } from '@/hooks/use-field';
import { createReactFormEngine } from '@/registries/builder-registry';

const ssrInputSchema = z.object({
	$type: z.literal('ssr-input'),
	id: z.string(),
	name: z.string(),
	label: z.optional(z.string()),
	grid: z.optional(z.custom<ElementGridConfig>()),
});

type SsrInputConfig = z.infer<typeof ssrInputSchema>;

function SsrFixtureInput(config: SsrInputConfig) {
	const { containerStyles, gridThemeId } = useControlledFormElement(config as unknown as FormEngine.ElementConfig);
	return (
		<div className="se-form-field" data-se-grid-theme={gridThemeId} style={containerStyles}>
			<label htmlFor={config.id}>{config.label ?? config.name}</label>
			<input id={config.id} name={config.name} aria-label={config.label ?? config.name} readOnly />
		</div>
	);
}

function createSsrAcceptanceEngine() {
	return createReactFormEngine({
		elements: [
			{
				$type: 'ssr-input',
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
			adapter: typeof rhfAdapter;
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
		cachedFixture = { engine, config, adapter: rhfAdapter };
	}
	return cachedFixture;
}
