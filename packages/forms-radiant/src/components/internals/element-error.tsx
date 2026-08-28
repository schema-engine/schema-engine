export interface ElementErrorProps {
	title: string;
	message: string;
	componentType?: string;
	className?: string;
	style?: Record<string, string | number | undefined>;
}

export function ElementError({ title, message, componentType, className, style }: ElementErrorProps) {
	return (
		<div class={className ? `se-element-error ${className}` : 'se-element-error'} style={style}>
			<p>
				<strong>{title}</strong>
			</p>
			{componentType ? <p>Component: {componentType}</p> : null}
			<p>{message}</p>
		</div>
	);
}
