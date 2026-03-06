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
        { label: 'PDF Document', value: 'image-to-pdf', outputExtension: 'pdf' },
    ],
    'image/jpeg': [
        { label: 'PNG Image', value: 'jpg-to-png', outputExtension: 'png' },
        { label: 'PDF Document', value: 'image-to-pdf', outputExtension: 'pdf' },
    ],
    'text/csv': [
        { label: 'Excel (.xlsx)', value: 'csv-to-xlsx', outputExtension: 'xlsx' },
    ],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        { label: 'CSV File', value: 'xlsx-to-csv', outputExtension: 'csv' },
    ],
    // Some browsers report .xlsx with this legacy MIME
    'application/vnd.ms-excel': [
        { label: 'CSV File', value: 'xlsx-to-csv', outputExtension: 'csv' },
    ],
};

/** All MIME types we accept */
export const ALLOWED_MIME_TYPES = new Set<string>(Object.keys(CONVERSION_MAP));

/** 10 MB in bytes */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
