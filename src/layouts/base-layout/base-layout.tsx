import type { ReactNode } from 'react';
import type { EcoComponent } from '@ecopages/core';
import clsx from 'clsx';

export type BaseLayoutProps = {
	children: ReactNode;
	className?: string;
	id?: string;
};

export const BaseLayout: EcoComponent<BaseLayoutProps, ReactNode> = ({ children, className }) => {
	return (
		<body>
			<main className={clsx('prose', className)}>{children}</main>
		</body>
	);
};

BaseLayout.config = {
	importMeta: import.meta,
	dependencies: {
		stylesheets: ['./base-layout.css', '../../styles/tailwind.css'],
		scripts: ['./base-layout.script.ts'],
	},
};
