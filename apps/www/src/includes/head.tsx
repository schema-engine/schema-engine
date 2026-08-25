import type { PageHeadProps } from '@ecopages/core';
import { eco } from '@ecopages/core';
import { Seo } from '@/includes/seo';
import type { ReactNode } from 'react';

export const Head = eco.component<PageHeadProps, ReactNode>({
	dependencies: {
		stylesheets: ['../styles/tailwind.css'],
		scripts: ['theme.script.ts'],
	},

	render: ({ metadata, children }) => {
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

				{children}
			</head>
		);
	},
});
