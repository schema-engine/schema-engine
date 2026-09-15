import { eco } from '@ecopages/core';
import { Head } from '@/includes/head';
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme';
import type { JsxRenderable } from '@ecopages/jsx';

const HtmlTemplate = eco.html<JsxRenderable>({
	dependencies: {
		scripts: [
			{
				content: THEME_BOOTSTRAP_SCRIPT,
			},
		],
	},
	render: ({ children, metadata, headContent, language = 'en' }) => {
		return (
			<html lang={language} data-rui-colors="schema">
				<Head metadata={metadata}>{headContent}</Head>
				{children as 'safe'}
			</html>
		);
	},
});

export default HtmlTemplate;
