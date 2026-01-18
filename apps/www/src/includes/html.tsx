import { eco } from '@ecopages/core';
import type { HtmlTemplateProps } from '@ecopages/core';
import { Head } from '@/includes/head';
import type { ReactNode } from 'react';

const HtmlTemplate = eco.component<HtmlTemplateProps, ReactNode>({
	dependencies: {
		components: [Head],
	},

	render: ({ children, metadata, headContent, language = 'en' }) => {
		return (
			<html lang={language}>
				<Head metadata={metadata}>{headContent as 'safe'}</Head>
				{children as 'safe'}
			</html>
		);
	},
});

export default HtmlTemplate;
