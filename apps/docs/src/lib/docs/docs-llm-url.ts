/**
 * Maps a docs page pathname to the static text export under `/llms-content/*`.
 *
 * @remarks
 * The generator writes each page as `llms-content/<slug>.txt`, where the slug is the page path
 * below `/docs/` (for example `forms/builder`). The ecopages docs template uses
 * `/docs-llm/<section>/<slug>.md` instead; this site keeps its public `/llms-content/` URLs
 * until that scheme is decided across sites.
 */
export function getDocsLlmUrlFromPathname(pathname: string): string | null {
	const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);

	if (segments[0] !== 'docs' || segments.length < 2) {
		return null;
	}

	return getDocsLlmUrl(segments.slice(1).join('/'));
}

/**
 * Maps a docs page slug to the generated static export used by the LLM copy action.
 */
export function getDocsLlmUrl(slug: string): string {
	return `/llms-content/${slug}.txt`;
}
