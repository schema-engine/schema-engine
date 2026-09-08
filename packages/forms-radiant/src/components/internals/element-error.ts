import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';

export interface ElementErrorProps {
	title: string;
	message: string;
	componentType?: string;
	className?: string;
	style?: Record<string, string | number | undefined>;
}

export function ElementError({ title, message, componentType, className, style }: ElementErrorProps): JsxRenderable {
	return jsx('div', {
		class: className ? `se-element-error ${className}` : 'se-element-error',
		style,
		children: [
			jsx('p', { children: jsx('strong', { children: title }) }),
			componentType ? jsx('p', { children: `Component: ${componentType}` }) : null,
			jsx('p', { children: message }),
		],
	});
}
