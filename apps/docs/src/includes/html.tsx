import { eco } from '@ecopages/core';
import type { EcoPagesElement } from '@ecopages/core';
import { Head } from '@/includes/head';
import { THEME_BOOTSTRAP_SCRIPT } from '@/lib/theme';

const HtmlTemplate = eco.html({
	dependencies: {
		scripts: [
			{
				content: THEME_BOOTSTRAP_SCRIPT,
			},
		],
	},
	render: ({ children, metadata, headContent, language = 'en' }): EcoPagesElement => {
		return (
			<html lang={language}>
				<Head metadata={metadata}>{headContent}</Head>
				{children as 'safe'}
			</html>
		) as EcoPagesElement;
	},
});

export default HtmlTemplate;
