import { useState } from 'react';

interface CodeBlockProps {
	code: string;
	fileName?: string;
	className?: string;
	maxHeight?: string;
}

interface LivePreviewProps {
	children: React.ReactNode;
	title?: string;
	className?: string;
}

interface CodePreviewProps {
	code: string;
	example: React.ReactNode;
	fileName?: string;
	className?: string;
	variant?: 'tabs' | 'split';
	maxHeight?: string;
}

export function CodeBlock({ code, fileName = 'config.json', className = '', maxHeight }: CodeBlockProps) {
	return (
		<div className={`bg-card rounded-xl shadow-2xl overflow-hidden border border-border ${className}`}>
			<div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted">
				<div className="w-3 h-3 bg-destructive rounded-full"></div>
				<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
				<div className="w-3 h-3 bg-green-500 rounded-full"></div>
				<span className="ml-auto text-xs text-muted-foreground">{fileName}</span>
			</div>
			<div
				className={`text-left overflow-x-auto ${maxHeight ? 'overflow-y-auto' : ''}`}
				style={maxHeight ? { maxHeight } : undefined}
			>
				<pre className="text-sm text-card-foreground text-left m-6">
					<code>{code}</code>
				</pre>
			</div>
		</div>
	);
}

export function LivePreview({ children, title = 'Live Preview', className = '' }: LivePreviewProps) {
	return (
		<div className={`bg-background rounded-xl shadow-2xl border border-border overflow-hidden ${className}`}>
			<div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted">
				<div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
				<div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
				<div className="w-3 h-3 bg-muted-foreground rounded-full"></div>
				<span className="ml-auto text-xs text-muted-foreground">{title}</span>
			</div>
			<div className="p-6 text-left">{children}</div>
		</div>
	);
}

export function CodePreview({
	code,
	example,
	fileName = 'config.json',
	className = '',
	variant = 'split',
	maxHeight,
}: CodePreviewProps) {
	const [activeTab, setActiveTab] = useState<'code' | 'example'>('code');

	const useTabs = variant === 'tabs';

	if (useTabs) {
		return (
			<div className={`mx-auto ${className}`}>
				<div className="relative flex bg-muted p-1 rounded-lg border border-border gap-2">
					<button
						type="button"
						className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
							activeTab === 'code'
								? 'bg-background text-foreground shadow-sm border border-border'
								: 'text-muted-foreground hover:text-foreground'
						}`}
						onClick={() => setActiveTab('code')}
					>
						Configuration
					</button>
					<button
						type="button"
						className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
							activeTab === 'example'
								? 'bg-background text-foreground shadow-sm border border-border'
								: 'text-muted-foreground hover:text-foreground'
						}`}
						onClick={() => setActiveTab('example')}
					>
						Live Preview
					</button>
				</div>

				{activeTab === 'code' ? (
					<CodeBlock code={code} fileName={fileName} className="mt-3" maxHeight={maxHeight} />
				) : (
					<LivePreview title="Live Preview" className="mt-3">
						{example}
					</LivePreview>
				)}
			</div>
		);
	}

	return (
		<div className={`mx-auto ${className}`}>
			<div className="hidden md:grid md:grid-cols-2 gap-6">
				<CodeBlock code={code} fileName={fileName} maxHeight={maxHeight} />
				<LivePreview title="Live Preview">{example}</LivePreview>
			</div>

			<div className="md:hidden">
				<div className="relative flex bg-muted p-1 rounded-lg border border-border gap-2">
					<button
						type="button"
						className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
							activeTab === 'code'
								? 'bg-background text-foreground shadow-sm border border-border'
								: 'text-muted-foreground hover:text-foreground'
						}`}
						onClick={() => setActiveTab('code')}
					>
						Configuration
					</button>
					<button
						type="button"
						className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
							activeTab === 'example'
								? 'bg-background text-foreground shadow-sm border border-border'
								: 'text-muted-foreground hover:text-foreground'
						}`}
						onClick={() => setActiveTab('example')}
					>
						Live Preview
					</button>
				</div>

				{activeTab === 'code' ? (
					<CodeBlock code={code} fileName={fileName} className="mt-3" maxHeight={maxHeight} />
				) : (
					<LivePreview title="Live Preview" className="mt-3">
						{example}
					</LivePreview>
				)}
			</div>
		</div>
	);
}
