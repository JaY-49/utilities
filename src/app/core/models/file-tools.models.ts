/** Describes a single tool within a tool group (PDF/Image) */
export interface ToolDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    gradient: string;            // CSS gradient for the card
    acceptedMimes: string[];
    maxFiles: number;
    maxFileSizeMb: number;
    supportsMultiFile: boolean;
}

export type ProcessingStatus = 'idle' | 'processing' | 'done' | 'error';

export interface FileItem {
    file: File;
    id: string;
    preview?: string;
    status: ProcessingStatus;
    progress: number;
    error?: string;
    result?: ProcessingResult;
}

export interface ProcessingResult {
    blob: Blob;
    filename: string;
    originalSize: number;
    resultSize: number;
}

export type OutputMode = 'single' | 'individual';

/** Create a FileItem from a raw File */
export function createFileItem(file: File): FileItem {
    return {
        file,
        id: crypto.randomUUID(),
        status: 'idle',
        progress: 0,
    };
}

/** Human-readable file size */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
