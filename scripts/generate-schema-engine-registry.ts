import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GITHUB = 'andeeplus/schema-engine';

const SHARED_FORMS_ROOT = 'registry/shared/forms';
const SHARED_PRIMITIVES_ROOT = 'registry/shared/primitives';

type BaseId = 'base-ui' | 'radix' | 'aria';
type PrimitiveName = 'combobox' | 'phone-input' | 'drop-zone' | 'masked-input';
type ItemType = 'registry:lib' | 'registry:ui' | 'registry:item' | 'registry:component';

interface CatalogFile {
	path: string;
	sourcePath: string;
	type: ItemType;
	target: string;
}

interface Registration {
	ident: string;
	from: string;
}

interface CatalogItem {
	name: string;
	type: ItemType;
	title: string;
	description: string;
	registryDependencies: string[];
	dependencies: string[];
	files: CatalogFile[];
	docs?: string;
	registration?: Registration;
	isStepper?: boolean;
}

/** Per-primitive metadata a base may override when its implementation differs. */
interface PrimitiveOverride {
	dependencies?: string[];
	registryDependencies?: string[];
	description?: string;
}

interface Base {
	id: BaseId;
	/** Appended to every item name so the three catalogs can coexist. */
	suffix: string;
	aggregateName: string;
	label: string;
	primitives?: Partial<Record<PrimitiveName, PrimitiveOverride>>;
}

/** Same-repo item stems. Resolved to `owner/repo/<stem><suffix>` per base. */
const UTILS = 'schema-engine-form-utils';
const FIELD_GROUP = 'schema-engine-form-field-group';

const PRIMITIVE_ITEM: Record<PrimitiveName, string> = {
	combobox: 'schema-engine-form-combobox-primitive',
	'phone-input': 'schema-engine-form-phone-primitive',
	'drop-zone': 'schema-engine-form-dropzone-primitive',
	'masked-input': 'schema-engine-form-masked-input-primitive',
};

interface PrimitiveSpec {
	title: string;
	description: string;
	registryDependencies: string[];
	dependencies: string[];
}

const PRIMITIVES: Record<PrimitiveName, PrimitiveSpec> = {
	combobox: {
		title: 'Schema Engine combobox',
		description: 'Chips-capable combobox primitive used by FormCombobox.',
		registryDependencies: [],
		dependencies: ['lucide-react'],
	},
	'phone-input': {
		title: 'Schema Engine phone input',
		description: 'Schema Engine phone input primitive.',
		registryDependencies: ['button', 'command', 'input', 'popover', 'scroll-area'],
		dependencies: ['react-phone-number-input', 'lucide-react'],
	},
	'drop-zone': {
		title: 'Schema Engine dropzone',
		description: 'Schema Engine dropzone primitive.',
		registryDependencies: ['button'],
		dependencies: ['react-dropzone', 'lucide-react'],
	},
	'masked-input': {
		title: 'Schema Engine masked input',
		description: 'Schema Engine masked input primitive powered by react-imask.',
		registryDependencies: [],
		dependencies: ['react-imask'],
	},
};

/**
 * A base only overrides primitive metadata where it also overrides the source
 * file in `registry/<base>/primitives`; everything else comes from the shared
 * implementation and the `PRIMITIVES` defaults above.
 */
const BASES: Base[] = [
	{
		id: 'base-ui',
		suffix: '',
		aggregateName: 'schema-form',
		label: 'Base UI',
		primitives: {
			combobox: {
				dependencies: ['@base-ui/react', 'lucide-react'],
				description: 'Chips-capable Base UI combobox primitive used by FormCombobox.',
			},
		},
	},
	{
		id: 'radix',
		suffix: '-radix',
		aggregateName: 'schema-form-radix',
		label: 'Radix UI',
		primitives: {
			combobox: {
				dependencies: ['cmdk', 'lucide-react'],
				registryDependencies: ['popover', 'command'],
				description: 'Chips-capable Radix combobox primitive (Popover + Command) used by FormCombobox.',
			},
		},
	},
	{
		id: 'aria',
		suffix: '-aria',
		aggregateName: 'schema-form-aria',
		label: 'React Aria',
		primitives: {
			combobox: {
				dependencies: ['react-aria-components', 'lucide-react'],
				description: 'Chips-capable React Aria combobox primitive used by FormCombobox.',
			},
			'phone-input': {
				dependencies: ['react-phone-number-input', 'lucide-react', 'react-aria-components'],
			},
			'drop-zone': {
				dependencies: ['react-aria-components', 'lucide-react'],
				description: 'Schema Engine dropzone primitive built on React Aria DropZone.',
			},
		},
	},
];

const FORM_RUNTIME_DEPENDENCIES = ['@schema-engine/forms-react', '@schema-engine/forms', 'zod'];

/**
 * Every form element ships the same triple of files and a registration, so the
 * catalog only records what actually varies between them.
 */
interface ElementSpec {
	/** Path stem under the forms root, e.g. `inputs/form-input`. */
	stem: string;
	title: string;
	/** Exported registration identifier. */
	ident: string;
	/** Item name stem. Defaults to `schema-engine-form-<slug>`. */
	name?: string;
	/** Defaults to `Schema Engine <slug> form element.` */
	description?: string;
	registryDependencies?: string[];
	/** npm deps beyond `FORM_RUNTIME_DEPENDENCIES`. */
	dependencies?: string[];
	/** Steppers are installed individually, so the aggregate item excludes them. */
	isStepper?: boolean;
}

const ELEMENTS: ElementSpec[] = [
	{
		stem: 'content/form-submission-alert',
		title: 'Submission alert',
		ident: 'SubmissionAlertElementRegistration',
		registryDependencies: ['alert'],
		dependencies: ['lucide-react'],
	},
	{
		stem: 'actions/submit-button',
		title: 'Submit button',
		ident: 'SubmitButtonElementRegistration',
		registryDependencies: ['button'],
	},
	{
		stem: 'inputs/form-fieldset',
		title: 'Fieldset',
		ident: 'FieldSetRegistration',
		registryDependencies: [FIELD_GROUP],
	},
	{
		stem: 'inputs/form-array-elements',
		title: 'Array elements',
		ident: 'ArrayElementRegistration',
		registryDependencies: ['button', UTILS, FIELD_GROUP],
		dependencies: ['lucide-react'],
	},
	{
		stem: 'inputs/form-phone-input',
		title: 'Phone input',
		ident: 'PhoneInputElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['phone-input'], FIELD_GROUP],
		dependencies: ['react-phone-number-input'],
	},
	{
		stem: 'inputs/form-masked-input',
		title: 'Masked input',
		description: 'Schema Engine masked-input form element for IBAN, cards, and other patterned values.',
		ident: 'MaskedInputElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['masked-input'], FIELD_GROUP],
	},
	{
		stem: 'inputs/form-textarea',
		title: 'Textarea',
		ident: 'TextareaElementRegistration',
		registryDependencies: ['textarea', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-checkbox',
		title: 'Checkbox',
		ident: 'CheckboxElementRegistration',
		registryDependencies: ['checkbox', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-input-otp',
		title: 'Input OTP',
		ident: 'InputOTPElementRegistration',
		registryDependencies: ['input-otp', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-drop-zone',
		title: 'Drop zone',
		ident: 'DropZoneElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM['drop-zone'], FIELD_GROUP],
	},
	{
		stem: 'inputs/form-checkbox-group',
		title: 'Checkbox group',
		ident: 'CheckboxGroupElementRegistration',
		registryDependencies: ['label', 'checkbox', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-number',
		title: 'Number',
		ident: 'NumberElementRegistration',
		registryDependencies: ['input', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-switch',
		title: 'Switch',
		ident: 'SwitchElementRegistration',
		registryDependencies: ['switch', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-select',
		title: 'Select',
		description: 'Schema Engine select form element. Supports multiple selection with chips.',
		ident: 'SelectElementRegistration',
		registryDependencies: ['select', FIELD_GROUP],
		dependencies: ['lucide-react'],
	},
	{
		stem: 'inputs/form-radio',
		title: 'Radio',
		ident: 'RadioElementRegistration',
		registryDependencies: ['label', 'radio-group', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-combobox',
		title: 'Combobox',
		description: 'Schema Engine combobox form element. Use multiple for chips-based multi-select.',
		ident: 'ComboboxElementRegistration',
		registryDependencies: [PRIMITIVE_ITEM.combobox, FIELD_GROUP],
	},
	{
		stem: 'inputs/form-slider',
		title: 'Slider',
		ident: 'SliderElementRegistration',
		registryDependencies: ['slider', FIELD_GROUP],
	},
	{
		stem: 'inputs/form-input',
		title: 'Input',
		ident: 'InputElementRegistration',
		registryDependencies: ['input', FIELD_GROUP],
	},
	{
		stem: 'steppers/default-stepper',
		name: 'schema-engine-form-stepper-default',
		title: 'Default stepper',
		description: 'Schema Engine default multi-step stepper.',
		ident: 'DefaultStepperRegistration',
		registryDependencies: ['button', 'badge', UTILS],
		dependencies: ['lucide-react'],
		isStepper: true,
	},
	{
		stem: 'steppers/minimalist-stepper',
		name: 'schema-engine-form-stepper-minimalist',
		title: 'Minimalist stepper',
		description: 'Schema Engine minimalist multi-step stepper.',
		ident: 'MinimalistStepperRegistration',
		registryDependencies: ['button', 'progress', UTILS],
		isStepper: true,
	},
];

function itemName(base: Base, stem: string): string {
	return stem + base.suffix;
}

/** Rewrites same-repo item stems into their addressable GitHub form. */
function resolveDep(base: Base, dep: string): string {
	const isSameRepo = dep.startsWith('schema-engine-form-') || dep.startsWith('schema-form');
	return isSameRepo ? `${GITHUB}/${itemName(base, dep)}` : dep;
}

interface FileCandidate {
	path: string;
	sourcePath: string;
}

/**
 * Both form wrappers and primitives resolve the same way: a base-specific file
 * wins when it exists, otherwise the shared implementation is used.
 */
function preferOverride(override: FileCandidate, shared: FileCandidate): FileCandidate {
	return existsSync(join(root, override.sourcePath)) ? override : shared;
}

function formFile(base: Base, rel: string): CatalogFile {
	const { path, sourcePath } = preferOverride(
		{ path: `overlays/forms/${rel}`, sourcePath: `registry/${base.id}/overlays/forms/${rel}` },
		{ path: `../shared/forms/${rel}`, sourcePath: `${SHARED_FORMS_ROOT}/${rel}` },
	);

	return {
		path,
		sourcePath,
		type: rel.endsWith('.tsx') ? 'registry:component' : 'registry:lib',
		target: `@components/schema-engine/forms/${rel}`,
	};
}

function primitiveFile(base: Base, name: PrimitiveName): CatalogFile {
	const rel = `${name}.tsx`;
	const { path, sourcePath } = preferOverride(
		{ path: `primitives/${rel}`, sourcePath: `registry/${base.id}/primitives/${rel}` },
		{ path: `../shared/primitives/${rel}`, sourcePath: `${SHARED_PRIMITIVES_ROOT}/${rel}` },
	);

	return { path, sourcePath, type: 'registry:ui', target: `@ui/schema-engine/components/${rel}` };
}

/** `inputs/form-drop-zone` -> `drop-zone` */
function elementSlug(stem: string): string {
	return stem.slice(stem.lastIndexOf('/') + 1).replace(/^form-/, '');
}

function buildPrimitiveItem(base: Base, name: PrimitiveName): CatalogItem {
	const spec = PRIMITIVES[name];
	const override = base.primitives?.[name] ?? {};

	return {
		name: itemName(base, PRIMITIVE_ITEM[name]),
		type: 'registry:ui',
		title: spec.title,
		description: override.description ?? spec.description,
		registryDependencies: (override.registryDependencies ?? spec.registryDependencies).map((dep) =>
			resolveDep(base, dep),
		),
		dependencies: override.dependencies ?? spec.dependencies,
		files: [primitiveFile(base, name)],
	};
}

function buildElementItem(base: Base, spec: ElementSpec): CatalogItem {
	const slug = elementSlug(spec.stem);

	return {
		name: itemName(base, spec.name ?? `schema-engine-form-${slug}`),
		type: 'registry:item',
		title: spec.title,
		description: spec.description ?? `Schema Engine ${slug} form element.`,
		registryDependencies: (spec.registryDependencies ?? []).map((dep) => resolveDep(base, dep)),
		dependencies: [...new Set([...(spec.dependencies ?? []), ...FORM_RUNTIME_DEPENDENCIES])],
		files: [
			formFile(base, `${spec.stem}.tsx`),
			formFile(base, `${spec.stem}.types.ts`),
			formFile(base, `${spec.stem}.registration.ts`),
		],
		registration: { ident: spec.ident, from: `./${spec.stem}.registration` },
		isStepper: spec.isStepper,
	};
}

function buildItems(base: Base): CatalogItem[] {
	return [
		{
			name: itemName(base, UTILS),
			type: 'registry:lib',
			title: 'Form utils',
			description: 'className helper for Schema Engine form elements.',
			registryDependencies: [],
			dependencies: ['clsx', 'tailwind-merge'],
			files: [formFile(base, 'lib/utils.ts')],
		},
		{
			name: itemName(base, FIELD_GROUP),
			type: 'registry:item',
			title: 'Field group',
			description: 'Label, description, and error chrome for Schema Engine fields.',
			registryDependencies: ['label', resolveDep(base, UTILS)],
			dependencies: [],
			files: [formFile(base, 'field-group.tsx')],
		},
		...(Object.keys(PRIMITIVES) as PrimitiveName[]).map((name) => buildPrimitiveItem(base, name)),
		...ELEMENTS.map((spec) => buildElementItem(base, spec)),
	];
}

function buildAggregate(base: Base, items: CatalogItem[]): CatalogItem {
	return {
		name: base.aggregateName,
		type: 'registry:item',
		title: `Schema Engine forms (${base.label})`,
		description: `All ${base.label} Schema Engine form elements and the generated registration barrel.`,
		docs: 'Import schemaFormRegistrations from @/components/schema-engine/forms/registrations and pass them to createReactFormComposer().addElements(...).',
		registryDependencies: items.filter((item) => !item.isStepper).map((item) => `${GITHUB}/${item.name}`),
		dependencies: FORM_RUNTIME_DEPENDENCIES,
		files: [
			formFile(base, 'registrations.ts'),
			formFile(base, 'index.ts'),
			formFile(base, 'inputs/index.ts'),
			formFile(base, 'actions/index.ts'),
			formFile(base, 'content/index.ts'),
		],
	};
}

interface BaseCatalog {
	base: Base;
	items: CatalogItem[];
	catalog: CatalogItem[];
}

const catalogsByBase: BaseCatalog[] = BASES.map((base) => {
	const items = buildItems(base);
	return { base, items, catalog: [...items, buildAggregate(base, items)] };
});

export const catalog: CatalogItem[] = catalogsByBase.flatMap((entry) => entry.catalog);

function collectImports(source: string): string[] {
	return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1] as string);
}

/** Import specifier prefix -> same-repo registry item stem. */
const REGISTRY_DEP_BY_IMPORT: Array<[string, string]> = [
	['@/components/ui/schema-engine/components/phone-input', PRIMITIVE_ITEM['phone-input']],
	['@/components/ui/schema-engine/components/drop-zone', PRIMITIVE_ITEM['drop-zone']],
	['@/components/ui/schema-engine/components/combobox', PRIMITIVE_ITEM.combobox],
	['@/components/ui/schema-engine/components/masked-input', PRIMITIVE_ITEM['masked-input']],
	['@/components/schema-engine/forms/field-group', FIELD_GROUP],
	['@/components/schema-engine/forms/lib/utils', UTILS],
];

/** Bare npm specifiers that must be declared when imported. */
const TRACKED_NPM_DEPENDENCIES = [
	'@schema-engine/forms-react',
	'@schema-engine/forms',
	'zod',
	'clsx',
	'tailwind-merge',
	'lucide-react',
	'@base-ui/react',
	'cmdk',
	'react-aria-components',
	'react-phone-number-input',
	'react-dropzone',
	'react-imask',
];

function expectedFromImports(imports: string[], base: Base) {
	const registryDependencies = new Set<string>();
	const dependencies = new Set<string>();

	for (const spec of imports) {
		const sameRepo = REGISTRY_DEP_BY_IMPORT.find(([prefix]) => spec.startsWith(prefix));
		if (sameRepo) {
			registryDependencies.add(resolveDep(base, sameRepo[1]));
			continue;
		}

		if (spec.startsWith('@/components/ui/')) {
			const rest = spec.slice('@/components/ui/'.length);
			if (!rest.startsWith('schema-engine/')) {
				registryDependencies.add(rest.split('/')[0] as string);
			}
			continue;
		}

		const npm = TRACKED_NPM_DEPENDENCIES.find((dep) => spec === dep || spec.startsWith(`${dep}/`));
		if (npm) dependencies.add(npm);
	}

	return { registryDependencies, dependencies };
}

/** Override dirs whose files must genuinely differ from the shared original. */
const OVERRIDE_ROOTS: Array<{ overrideDir: (base: Base) => string; sharedDir: string }> = [
	{ overrideDir: (base) => `registry/${base.id}/overlays/forms`, sharedDir: SHARED_FORMS_ROOT },
	{ overrideDir: (base) => `registry/${base.id}/primitives`, sharedDir: SHARED_PRIMITIVES_ROOT },
];

function checkOverrideIsNotACopy(base: Base, file: CatalogFile, errors: string[]): void {
	for (const { overrideDir, sharedDir } of OVERRIDE_ROOTS) {
		const prefix = `${overrideDir(base)}/`;
		if (!file.sourcePath.startsWith(prefix)) continue;

		const sharedPath = join(root, sharedDir, file.sourcePath.slice(prefix.length));
		if (!existsSync(sharedPath)) return;

		if (readFileSync(join(root, file.sourcePath), 'utf8') === readFileSync(sharedPath, 'utf8')) {
			errors.push(`${file.sourcePath} is identical to the shared original; delete the override`);
		}
	}
}

export function validateCatalog(): string[] {
	const errors: string[] = [];
	const names = new Set<string>();

	for (const { base, items, catalog: baseCatalog } of catalogsByBase) {
		for (const item of baseCatalog) {
			if (names.has(item.name)) errors.push(`duplicate item name: ${item.name}`);
			names.add(item.name);

			for (const file of item.files) {
				if (!existsSync(join(root, file.sourcePath))) {
					errors.push(`${item.name} missing file ${file.sourcePath}`);
					continue;
				}
				if (!file.target.startsWith('@components/') && !file.target.startsWith('@ui/')) {
					errors.push(`${item.name} file ${file.path} target must use @components/ or @ui/`);
				}
				checkOverrideIsNotACopy(base, file, errors);
			}

			if (item.name === base.aggregateName) continue;

			const imports = item.files
				.filter((file) => existsSync(join(root, file.sourcePath)))
				.flatMap((file) => collectImports(readFileSync(join(root, file.sourcePath), 'utf8')));

			for (const spec of imports) {
				if (spec.includes('@schema-engine/forms-react/components/internals')) {
					errors.push(`${item.name} reaches into forms-react internals: ${spec}`);
				}
			}

			const expected = expectedFromImports(imports, base);
			for (const dep of expected.registryDependencies) {
				if (!item.registryDependencies.includes(dep)) {
					errors.push(`${item.name} missing registryDependency ${dep}`);
				}
			}
			for (const dep of expected.dependencies) {
				if (!item.dependencies.includes(dep)) {
					errors.push(`${item.name} missing npm dependency ${dep}`);
				}
			}
		}

		const aggregate = baseCatalog.find((item) => item.name === base.aggregateName);
		if (!aggregate) {
			errors.push(`${base.id} is missing its ${base.aggregateName} aggregate item`);
			continue;
		}

		const owned = new Set(items.flatMap((item) => item.files.map((file) => file.path)));
		for (const file of aggregate.files) {
			if (owned.has(file.path) && !file.path.endsWith('registrations.ts') && !file.path.endsWith('index.ts')) {
				errors.push(`${base.aggregateName} should not re-ship ${file.path}`);
			}
		}
	}

	return errors;
}

function elementRegistrations(): Registration[] {
	const [primary] = catalogsByBase;
	if (!primary) return [];

	return primary.items
		.filter(
			(item): item is CatalogItem & { registration: Registration } =>
				Boolean(item.registration) && !item.isStepper,
		)
		.map((item) => item.registration);
}

function renderRegistrations(registrations: Registration[]): string {
	const imports = registrations.map((entry) => `import { ${entry.ident} } from '${entry.from}';`).join('\n');
	const idents = registrations.map((entry) => entry.ident);

	return `/**
 * Generated registration barrel for the aggregate \`schema-form\` item.
 * Consumers can import this once to install every Schema Engine form element.
 */
${imports}

export {
	${idents.join(',\n\t')},
};

export const schemaFormRegistrations = [
	${idents.join(',\n\t')},
];
`;
}

function toRegistryItem(item: CatalogItem) {
	const { registration: _registration, isStepper: _isStepper, ...rest } = item;
	return {
		...rest,
		files: rest.files.map(({ sourcePath: _sourcePath, ...file }) => file),
	};
}

function buildBaseRegistry(entry: BaseCatalog) {
	return {
		$schema: 'https://ui.shadcn.com/schema/registry.json',
		name: `schema-engine-${entry.base.id}`,
		homepage: `https://github.com/${GITHUB}`,
		items: entry.catalog.map(toRegistryItem),
	};
}

function buildRootRegistry() {
	return {
		$schema: 'https://ui.shadcn.com/schema/registry.json',
		name: 'schema-engine',
		homepage: `https://github.com/${GITHUB}`,
		include: BASES.map((base) => `registry/${base.id}/registry.json`),
	};
}

/**
 * Every generated artifact, keyed by repo-relative path. `generate` writes this
 * map and `--check` compares against it, so the two can never disagree.
 */
export function buildOutputs(): Map<string, string> {
	const outputs = new Map<string, string>();

	outputs.set('registry.json', `${JSON.stringify(buildRootRegistry(), null, 2)}\n`);
	outputs.set(`${SHARED_FORMS_ROOT}/registrations.ts`, renderRegistrations(elementRegistrations()));

	for (const entry of catalogsByBase) {
		outputs.set(
			`registry/${entry.base.id}/registry.json`,
			`${JSON.stringify(buildBaseRegistry(entry), null, 2)}\n`,
		);
	}

	return outputs;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
	const errors = validateCatalog();
	if (errors.length > 0) {
		console.error(`Registry catalog is invalid:\n- ${errors.join('\n- ')}`);
		process.exit(1);
	}

	const outputs = buildOutputs();

	if (process.argv.includes('--check')) {
		const stale = [...outputs].filter(([rel, contents]) => {
			const abs = join(root, rel);
			return !existsSync(abs) || readFileSync(abs, 'utf8') !== contents;
		});

		if (stale.length > 0) {
			console.error(
				`Stale generated files. Run pnpm run registry:generate\n- ${stale.map(([rel]) => rel).join('\n- ')}`,
			);
			process.exit(1);
		}

		console.log(`registry catalog ok (${catalog.length} items, ${outputs.size} generated files)`);
	} else {
		for (const [rel, contents] of outputs) {
			const abs = join(root, rel);
			mkdirSync(dirname(abs), { recursive: true });
			writeFileSync(abs, contents);
		}

		console.log(`wrote ${outputs.size} generated files (${catalog.length} catalog items)`);
	}
}
