import type { EcoComponent, PageHeadProps } from '@ecopages/core';
import type { JSX } from 'react';
import { Seo } from '@/includes/seo';

/**
 * @todo https://react.dev/blog/2024/04/25/react-19#support-for-preloading-resources
 */
export const Head: EcoComponent<PageHeadProps, JSX.Element> = ({ metadata, children }) => {
	return (
		<head>
			<meta charSet="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<Seo {...metadata} />

			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
			<link
				href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=IBM+Plex+Serif:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
				rel="stylesheet"
			/>

			<script src="/assets/includes/theme.script.js"></script>
			{children}
		</head>
	);
};

Head.config = {
	importMeta: import.meta,
	dependencies: {
		scripts: ['theme.script.ts?exclude-from-html=true'],
		stylesheets: ['../styles/tailwind.css'],
	},
};
