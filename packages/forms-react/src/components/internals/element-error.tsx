import { cx } from 'class-variance-authority';
import type React from 'react';

export interface ElementErrorProps {
	title: string;
	message: string;
	componentType?: string;
	className?: string;
	style?: React.CSSProperties;
}

export function ElementError({ title, message, componentType, className, style }: ElementErrorProps) {
	return (
		<div className={cx('rounded-lg border border-red-200 bg-red-50 p-4', className)} style={style}>
			<div className="flex-1">
				<p className="text-red-900 font-semibold flex gap-2">
					<span className="text-red-600 text-lg font-semibold">[error] </span>
					{title}
				</p>
				{componentType && <p className="text-red-700 text-sm mt-1">Component: {componentType}</p>}
				<p className="text-red-700 text-xs mt-2 font-mono bg-red-100 p-2 rounded">{message}</p>
			</div>
		</div>
	);
}
