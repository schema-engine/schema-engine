import { join } from 'node:path';
import { ContentScanner, compareEntriesByField } from '@ecopages/content-processor';
import appConfig from '../eco.config';
import { docsFrontmatterSchema, LLM_SECTION_ORDER } from '../src/content/docs';
import { generateLlmDocs } from '../src/lib/llm-docs';

const ROOT_DIR = join(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'src/public');

const LLMS_HEADER = [
	'# Schema Engine Documentation',
	'> Build typed JSON-driven forms, React adapters, actions, and registries with Schema Engine.',
	'> Start at https://schema-engine.ecopages.app/skill.txt or https://schema-engine.ecopages.app/skill/SKILL.md',
	'',
];

const scanner = new ContentScanner({
	contentRoot: join(appConfig.absolutePaths.srcDir, 'content/docs'),
	orderBy: compareEntriesByField('order'),
	schema: docsFrontmatterSchema,
});

await generateLlmDocs(scanner, {
	outputDir: join(PUBLIC_DIR, 'llms-content'),
	indexPath: join(PUBLIC_DIR, 'llms.txt'),
	baseUrl: process.env.ECOPAGES_BASE_URL ?? 'https://schema-engine.ecopages.app',
	sectionOrder: LLM_SECTION_ORDER,
	headerLines: LLMS_HEADER,
});

console.log('[llms.txt] Successfully generated llms.txt and content files.');
