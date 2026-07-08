import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from 'react';

const cn = (...classes: (string | false | null | undefined)[]) =>
	classes.filter(Boolean).join(' ');

type TabsContextValue = {
	value: string;
	setValue: (next: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
	const ctx = useContext(TabsContext);
	if (!ctx) {
		throw new Error(`${component} must be used inside <Tabs />`);
	}
	return ctx;
}

type TabsProps = HTMLAttributes<HTMLDivElement> & {
	defaultValue: string;
	value?: string;
	onValueChange?: (value: string) => void;
	children?: ReactNode;
};

export function Tabs({ defaultValue, value, onValueChange, className, children, ...rest }: TabsProps) {
	const [internal, setInternal] = useState(defaultValue);
	const current = value ?? internal;
	const setValue = (next: string) => {
		if (value === undefined) {
			setInternal(next);
		}
		onValueChange?.(next);
	};

	return (
		<TabsContext.Provider value={{ value: current, setValue }}>
			<div className={cn(className)} {...rest}>
				{children}
			</div>
		</TabsContext.Provider>
	);
}

export function TabsList({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			role="tablist"
			className={cn(
				'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
				className,
			)}
			{...rest}
		>
			{children}
		</div>
	);
}

type TabsTriggerProps = HTMLAttributes<HTMLButtonElement> & {
	value: string;
	children?: ReactNode;
};

export function TabsTrigger({ value, className, children, ...rest }: TabsTriggerProps) {
	const ctx = useTabsContext('TabsTrigger');
	const active = ctx.value === value;
	return (
		<button
			type="button"
			role="tab"
			aria-selected={active}
			data-state={active ? 'active' : 'inactive'}
			onClick={() => ctx.setValue(value)}
			className={cn(
				'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
				active
					? 'bg-background text-foreground shadow-sm'
					: 'text-muted-foreground hover:text-foreground',
				className,
			)}
			{...rest}
		>
			{children}
		</button>
	);
}

type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
	value: string;
	children?: ReactNode;
};

export function TabsContent({ value, className, children, ...rest }: TabsContentProps) {
	const ctx = useTabsContext('TabsContent');
	if (ctx.value !== value) {
		return null;
	}
	return (
		<div
			role="tabpanel"
			data-state={ctx.value === value ? 'active' : 'inactive'}
			className={cn(
				'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
				className,
			)}
			{...rest}
		>
			{children}
		</div>
	);
}
