import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	children?: ReactNode;
	asChild?: boolean;
	variant?: string;
	size?: string;
	render?: (props: ButtonHTMLAttributes<HTMLButtonElement>) => ReactNode;
};

export function Button({ children, asChild: _asChild, render, ...props }: ButtonProps) {
	if (render) {
		return render(props);
	}
	return (
		<button type="button" {...props}>
			{children}
		</button>
	);
}
