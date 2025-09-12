import { useState } from 'react';

interface CodeBlockProps {
	code: string;
	fileName?: string;
	className?: string;
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
}

export function CodeBlock({ code, fileName = 'config.json', className = '' }: CodeBlockProps) {
	return (
		<div className={`bg-gray-900 rounded-xl shadow-2xl overflow-hidden ${className}`}>
			<div className="flex items-center gap-2 px-6 py-4 border-b border-gray-700">
				<div className="w-3 h-3 bg-red-500 rounded-full"></div>
				<div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
				<div className="w-3 h-3 bg-green-500 rounded-full"></div>
				<span className="ml-auto text-xs text-gray-400">{fileName}</span>
			</div>
			<div className="p-6 text-left">
				<pre className="text-sm text-gray-300 overflow-x-auto text-left">
					<code>{code}</code>
				</pre>
			</div>
		</div>
	);
}

export function LivePreview({ children, title = 'Live Preview', className = '' }: LivePreviewProps) {
	return (
		<div className={`bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden ${className}`}>
			<div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
				<div className="w-3 h-3 bg-gray-300 rounded-full"></div>
				<div className="w-3 h-3 bg-gray-300 rounded-full"></div>
				<div className="w-3 h-3 bg-gray-300 rounded-full"></div>
				<span className="ml-auto text-xs text-gray-500">{title}</span>
			</div>
			<div className="p-6 text-left">{children}</div>
		</div>
	);
}

export function CodePreview({ code, example, fileName = 'config.json', className = '' }: CodePreviewProps) {
	const [activeTab, setActiveTab] = useState<'code' | 'example'>('code');

	return (
		<div className={`mx-auto ${className}`}>
			<div className="hidden md:grid md:grid-cols-2 gap-6">
				<CodeBlock code={code} fileName={fileName} />
				<LivePreview title="Live Preview">{example}</LivePreview>
			</div>

			<div className="md:hidden">
				<div className="relative flex bg-gray-50 p-1 rounded-lg border border-gray-200 gap-2">
					<button
						type="button"
						className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
							activeTab === 'code'
								? 'bg-white text-gray-900 shadow-sm border border-gray-200'
								: 'text-gray-500 hover:text-gray-700'
						}`}
						onClick={() => setActiveTab('code')}
					>
						Configuration
					</button>
					<button
						type="button"
						className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
							activeTab === 'example'
								? 'bg-white text-gray-900 shadow-sm border border-gray-200'
								: 'text-gray-500 hover:text-gray-700'
						}`}
						onClick={() => setActiveTab('example')}
					>
						Live Preview
					</button>
				</div>

				{activeTab === 'code' ? (
					<CodeBlock code={code} fileName={fileName} className="mt-3" />
				) : (
					<LivePreview title="Live Preview" className="mt-3">
						{example}
					</LivePreview>
				)}
			</div>
		</div>
	);
}
