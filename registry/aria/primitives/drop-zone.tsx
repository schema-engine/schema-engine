'use client';

import { UploadIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { DropZone as DropZonePrimitive, FileTrigger } from 'react-aria-components';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DropzoneContextType = {
	src?: File[];
	accept?: string;
	maxSize?: number;
	minSize?: number;
	maxFiles?: number;
};

const renderBytes = (bytes: number) => {
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(2)}${units[unitIndex]}`;
};

const DropzoneContext = createContext<DropzoneContextType | undefined>(undefined);

export type DropzoneProps = {
	src?: File[];
	className?: string;
	accept?: Record<string, string[]>;
	maxFiles?: number;
	maxSize?: number;
	minSize?: number;
	disabled?: boolean;
	onDrop?: (acceptedFiles: File[]) => void;
	onError?: (error: Error) => void;
	children?: ReactNode;
};

export const Dropzone = ({
	accept,
	maxFiles = 1,
	maxSize,
	minSize,
	onDrop,
	onError,
	disabled,
	src,
	className,
	children,
}: DropzoneProps) => {
	const acceptString = accept ? Object.keys(accept).join(',') : undefined;

	return (
		<DropzoneContext.Provider
			key={JSON.stringify(src)}
			value={{ src, accept: acceptString, maxSize, minSize, maxFiles }}
		>
			<DropZonePrimitive
				className={cn(
					'group/dropzone relative w-full',
					disabled && 'pointer-events-none opacity-50',
					className,
				)}
				isDisabled={disabled}
				onDrop={async (event) => {
					const files: File[] = [];
					for (const item of event.items) {
						if (item.kind === 'file') {
							files.push(await item.getFile());
						}
					}

					if (files.length > maxFiles) {
						onError?.(new Error(`Maximum ${maxFiles} file(s) allowed`));
						return;
					}

					for (const file of files) {
						if (minSize && file.size < minSize) {
							onError?.(new Error(`File must be at least ${renderBytes(minSize)}`));
							return;
						}
						if (maxSize && file.size > maxSize) {
							onError?.(new Error(`File must be less than ${renderBytes(maxSize)}`));
							return;
						}
					}

					onDrop?.(files);
				}}
			>
				<FileTrigger
					allowsMultiple={maxFiles > 1}
					acceptedFileTypes={acceptString?.split(',')}
					onSelect={(fileList) => {
						if (!fileList) return;
						const files = Array.from(fileList);
						if (files.length > maxFiles) {
							onError?.(new Error(`Maximum ${maxFiles} file(s) allowed`));
							return;
						}
						onDrop?.(files);
					}}
				>
					<Button
						data-slot="dropzone"
						className={cn(
							'relative h-auto w-full flex-col overflow-hidden p-8 text-foreground hover:no-underline border-dashed border-2 border-input text-center justify-center transition-colors hover:bg-muted/50',
							'group-data-[drop-target]:outline-none group-data-[drop-target]:ring-1 group-data-[drop-target]:ring-ring',
							className,
						)}
						disabled={disabled}
						type="button"
						variant="link"
					>
						{children}
					</Button>
				</FileTrigger>
			</DropZonePrimitive>
		</DropzoneContext.Provider>
	);
};

const useDropzoneContext = () => {
	const context = useContext(DropzoneContext);
	if (!context) {
		throw new Error('useDropzoneContext must be used within a Dropzone');
	}
	return context;
};

export type DropzoneContentProps = {
	children?: ReactNode;
	className?: string;
};

const maxLabelItems = 3;

export const DropzoneContent = ({ children, className }: DropzoneContentProps) => {
	const { src } = useDropzoneContext();

	if (!src) return null;

	if (children) return children;

	return (
		<div className={cn('flex flex-col items-center justify-center', className)}>
			<div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<UploadIcon size={16} />
			</div>
			<p className="my-2 w-full truncate font-medium text-sm">
				{src.length > maxLabelItems
					? `${new Intl.ListFormat('en').format(
							src.slice(0, maxLabelItems).map((file) => file.name),
						)} and ${src.length - maxLabelItems} more`
					: new Intl.ListFormat('en').format(src.map((file) => file.name))}
			</p>
			<p className="w-full text-wrap text-muted-foreground text-xs">Drag and drop or click to replace</p>
		</div>
	);
};

export type DropzoneEmptyStateProps = {
	children?: ReactNode;
	className?: string;
};

export const DropzoneEmptyState = ({ children, className }: DropzoneEmptyStateProps) => {
	const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext();
	if (src) {
		return null;
	}
	if (children) {
		return children;
	}
	let caption = '';
	if (accept) {
		caption += 'Accepts ';
		caption += accept;
	}
	if (minSize && maxSize) {
		caption += ` between ${renderBytes(minSize)} and ${renderBytes(maxSize)}`;
	} else if (minSize) {
		caption += ` at least ${renderBytes(minSize)}`;
	} else if (maxSize) {
		caption += ` less than ${renderBytes(maxSize)}`;
	}
	return (
		<div className={cn('flex flex-col items-center justify-center', className)}>
			<div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<UploadIcon size={16} />
			</div>
			<p className="my-2 w-full truncate text-wrap font-medium text-sm">
				Upload {maxFiles === 1 ? 'a file' : 'files'}
			</p>
			<p className="w-full truncate text-wrap text-muted-foreground text-xs">Drag and drop or click to upload</p>
			{caption ? <p className="text-wrap text-muted-foreground text-xs">{caption}.</p> : null}
		</div>
	);
};
