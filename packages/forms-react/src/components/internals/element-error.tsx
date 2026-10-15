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
		<div className={['se-element-error', className].filter(Boolean).join(' ')} style={style}>
			<div className="se-element-error__content">
				<p className="se-element-error__title">
					<span className="se-element-error__marker">[error] </span>
					{title}
				</p>
				{componentType && <p className="se-element-error__type">Component: {componentType}</p>}
				<p className="se-element-error__message">{message}</p>
			</div>
		</div>
	);
}
