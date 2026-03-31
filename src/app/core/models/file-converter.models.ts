/** Supported source-to-target conversion mapping */
export interface ConversionOption {
    label: string;
    value: string;
    outputExtension: string;
}

export interface ConversionResult {
    blob: Blob;
    filename: string;
}

export interface TimeDiff {
    hours: number;
    minutes: number;
    totalMinutes: number;
}

/** Maps a MIME type to the list of target formats it can convert to */
export const CONVERSION_MAP: Record<string, ConversionOption[]> = {
    'image/png': [
        { label: 'JPG Image', value: 'png-to-jpg', outputExtension: 'jpg' },
        { label: 'WebP Image', value: 'image-to-webp', outputExtension: 'webp' },
        { label: 'PDF Document', value: 'image-to-pdf', outputExtension: 'pdf' },
    ],
    'image/jpeg': [
        { label: 'PNG Image', value: 'jpg-to-png', outputExtension: 'png' },
        { label: 'WebP Image', value: 'image-to-webp', outputExtension: 'webp' },
        { label: 'PDF Document', value: 'image-to-pdf', outputExtension: 'pdf' },
    ],
    'image/webp': [
        { label: 'PNG Image', value: 'webp-to-png', outputExtension: 'png' },
        { label: 'JPG Image', value: 'webp-to-jpg', outputExtension: 'jpg' },
    ],
    'image/heic': [
        { label: 'JPG Image', value: 'heic-to-jpg', outputExtension: 'jpg' },
    ],
    'image/svg+xml': [
        { label: 'PNG Image', value: 'svg-to-png', outputExtension: 'png' },
        { label: 'JPG Image', value: 'svg-to-jpg', outputExtension: 'jpg' },
    ],
    'text/csv': [
        { label: 'Excel (.xlsx)', value: 'csv-to-xlsx', outputExtension: 'xlsx' },
        { label: 'JSON', value: 'csv-to-json', outputExtension: 'json' },
        { label: 'XML', value: 'csv-to-xml', outputExtension: 'xml' },
        { label: 'TSV', value: 'csv-to-tsv', outputExtension: 'tsv' },
    ],
    'application/json': [
        { label: 'CSV File', value: 'json-to-csv', outputExtension: 'csv' },
        { label: 'XML', value: 'json-to-xml', outputExtension: 'xml' },
        { label: 'YAML', value: 'json-to-yaml', outputExtension: 'yaml' },
        { label: 'TOML', value: 'json-to-toml', outputExtension: 'toml' },
        { label: 'BSON', value: 'json-to-bson', outputExtension: 'bson' },
        { label: 'Excel (.xlsx)', value: 'json-to-xlsx', outputExtension: 'xlsx' },
        { label: 'INI', value: 'json-to-ini', outputExtension: 'ini' },
    ],
    'application/xml': [
        { label: 'JSON', value: 'xml-to-json', outputExtension: 'json' },
        { label: 'CSV File', value: 'xml-to-csv', outputExtension: 'csv' },
        { label: 'YAML', value: 'xml-to-yaml', outputExtension: 'yaml' },
    ],
    'text/yaml': [
        { label: 'JSON', value: 'yaml-to-json', outputExtension: 'json' },
        { label: 'XML', value: 'yaml-to-xml', outputExtension: 'xml' },
        { label: 'TOML', value: 'yaml-to-toml', outputExtension: 'toml' },
    ],
    'application/x-yaml': [
        { label: 'JSON', value: 'yaml-to-json', outputExtension: 'json' },
        { label: 'XML', value: 'yaml-to-xml', outputExtension: 'xml' },
        { label: 'TOML', value: 'yaml-to-toml', outputExtension: 'toml' },
    ],
    'application/pdf': [
        { label: 'PNG Images (ZIP)', value: 'pdf-to-png', outputExtension: 'zip' },
        { label: 'JPG Images (ZIP)', value: 'pdf-to-jpg', outputExtension: 'zip' },
        { label: 'Text (.txt)', value: 'pdf-to-txt', outputExtension: 'txt' },
        { label: 'HTML', value: 'pdf-to-html', outputExtension: 'html' },
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        { label: 'HTML', value: 'docx-to-html', outputExtension: 'html' },
        { label: 'Text (.txt)', value: 'docx-to-txt', outputExtension: 'txt' },
        { label: 'PDF Document', value: 'docx-to-pdf', outputExtension: 'pdf' },
    ],
    'text/markdown': [
        { label: 'HTML', value: 'markdown-to-html', outputExtension: 'html' },
        { label: 'PDF Document', value: 'markdown-to-pdf', outputExtension: 'pdf' },
    ],
    'text/html': [
        { label: 'Markdown', value: 'html-to-markdown', outputExtension: 'md' },
        { label: 'PDF Document', value: 'html-to-pdf', outputExtension: 'pdf' },
        { label: 'PNG Image', value: 'html-to-png', outputExtension: 'png' },
    ],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        { label: 'CSV File', value: 'xlsx-to-csv', outputExtension: 'csv' },
        { label: 'JSON', value: 'xlsx-to-json', outputExtension: 'json' },
    ],
    'application/zip': [
        { label: 'Extract', value: 'zip-extract', outputExtension: 'zip' },
    ],
    'text/plain': [
        { label: 'CSV File', value: 'txt-to-csv', outputExtension: 'csv' },
        { label: 'JSON', value: 'txt-to-json', outputExtension: 'json' },
    ],
};

/** All MIME types we accept */
export const ALLOWED_MIME_TYPES = new Set<string>(Object.keys(CONVERSION_MAP));

/** 50 MB in bytes (increased for larger files) */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/** Maximum number of files in a batch */
export const MAX_BATCH_FILES = 20;

// ─── Multi-file types ────────────────────────────────────────────────────────

export type ProcessingMode = 'merge' | 'separate';

export interface FileItemState {
    file: File;
    status: 'pending' | 'converting' | 'done' | 'error';
    error?: string;
    result?: ConversionResult;
}

export interface BatchResult {
    blob: Blob;
    filename: string;
    mode: ProcessingMode;
    fileCount: number;
}

export interface MergeConversion {
    label: string;
    value: string;
    outputExtension: string;
    sourceMimes: Set<string>;
}

/** Image MIME types that can be merged into a single PDF */
export const MERGEABLE_MIME_TYPES = new Set<string>([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
]);

/** Available merge conversions */
export const MERGE_CONVERSIONS: MergeConversion[] = [
    {
        label: 'PDF Document (merged)',
        value: 'images-to-pdf',
        outputExtension: 'pdf',
        sourceMimes: MERGEABLE_MIME_TYPES,
    },
];

/**
 * Returns the merge conversions available for a given set of files.
 * All files must have MIME types within the same sourceMimes set.
 */
export function canMerge(files: File[]): MergeConversion[] {
    if (files.length < 2) return [];
    return MERGE_CONVERSIONS.filter((mc) =>
        files.every((f) => mc.sourceMimes.has(f.type))
    );
}

/**
 * Returns the intersection of ConversionOptions available for all files.
 * Only formats whose `value` appears in every file's CONVERSION_MAP entry are included.
 */
export function getCommonFormats(files: File[]): ConversionOption[] {
    if (files.length === 0) return [];
    const optionSets = files.map((f) => CONVERSION_MAP[f.type] ?? []);
    if (optionSets.some((s) => s.length === 0)) return [];

    const first = optionSets[0];
    return first.filter((opt) =>
        optionSets.every((set) => set.some((s) => s.value === opt.value))
    );
}
