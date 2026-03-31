import {
    Component,
    inject,
    signal,
    computed,
    ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { saveAs } from 'file-saver';

import { FileConverterService } from '../../core/services/file-converter.service';
import {
    ALLOWED_MIME_TYPES,
    CONVERSION_MAP,
    ConversionOption,
    ConversionResult,
    MAX_FILE_SIZE_BYTES,
    MAX_BATCH_FILES,
    ProcessingMode,
    FileItemState,
    BatchResult,
    MergeConversion,
    canMerge,
    getCommonFormats,
} from '../../core/models/file-converter.models';

@Component({
    selector: 'app-file-converter',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatProgressBarModule,
        MatChipsModule,
        MatTooltipModule,
    ],
    templateUrl: './file-converter.component.html',
})
export class FileConverterComponent {
    private readonly converterSvc = inject(FileConverterService);

    // ─── Single-file state (preserved) ───────────────────────────────────────
    selectedFile = signal<File | null>(null);
    selectedFormat = signal<string>('');
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);
    result = signal<ConversionResult | null>(null);
    isDragOver = signal(false);

    /** Conversion options available for the currently selected file's MIME type */
    availableFormats = computed<ConversionOption[]>(() => {
        const file = this.selectedFile();
        if (!file) return [];
        return CONVERSION_MAP[file.type] ?? [];
    });

    readonly maxSizeMb = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    readonly maxBatchFiles = MAX_BATCH_FILES;

    // ─── Multi-file state ────────────────────────────────────────────────────
    selectedFiles = signal<File[]>([]);
    processingMode = signal<ProcessingMode | null>(null);
    selectedMergeFormat = signal<string>('');
    selectedBatchFormat = signal<string>('');
    fileStates = signal<FileItemState[]>([]);
    batchResult = signal<BatchResult | null>(null);

    /** True when 2+ files are selected */
    isMultiFile = computed(() => this.selectedFiles().length > 1);

    /** Available merge conversions for the current file set */
    mergeConversions = computed<MergeConversion[]>(() =>
        canMerge(this.selectedFiles())
    );

    /** Whether merge is possible for the current file set */
    canMergeFiles = computed(() => this.mergeConversions().length > 0);

    /** Formats common to ALL selected files (for "convert separately") */
    commonFormats = computed<ConversionOption[]>(() =>
        getCommonFormats(this.selectedFiles())
    );

    /** Batch progress derived from fileStates */
    batchProgress = computed(() => {
        const states = this.fileStates();
        if (states.length === 0) return { done: 0, total: 0, percent: 0 };
        const done = states.filter(
            (s) => s.status === 'done' || s.status === 'error'
        ).length;
        return {
            done,
            total: states.length,
            percent: Math.round((done / states.length) * 100),
        };
    });

    // ─── Drag-and-drop handlers ──────────────────────────────────────────────

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver.set(true);
    }

    onDragLeave(): void {
        this.isDragOver.set(false);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver.set(false);
        const fileList = event.dataTransfer?.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        if (files.length === 1) {
            this.processFile(files[0]);
        } else {
            this.processFiles(files);
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const fileList = input.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        if (files.length === 1) {
            this.processFile(files[0]);
        } else {
            this.processFiles(files);
        }
        // Reset input value so the same files can be re-selected after reset
        input.value = '';
    }

    // ─── File validation & processing ────────────────────────────────────────

    /** Single file processing (existing flow) */
    private processFile(file: File): void {
        this.reset(false);

        if (file.size > MAX_FILE_SIZE_BYTES) {
            this.errorMessage.set(
                `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${this.maxSizeMb} MB.`
            );
            return;
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            this.errorMessage.set(
                `Unsupported file type: "${file.type || 'unknown'}". ` +
                `Please try another file.`
            );
            return;
        }

        this.selectedFile.set(file);
        this.selectedFiles.set([file]);
        this.selectedFormat.set('');
    }

    /** Multi-file processing with validation */
    private processFiles(files: File[]): void {
        this.reset(true);

        if (files.length > MAX_BATCH_FILES) {
            this.errorMessage.set(
                `Too many files (${files.length}). Maximum ${MAX_BATCH_FILES} files per batch.`
            );
            return;
        }

        const errors: string[] = [];
        const validFiles: File[] = [];

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                errors.push(
                    `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB)`
                );
            } else if (!ALLOWED_MIME_TYPES.has(file.type)) {
                errors.push(
                    `"${file.name}" has unsupported type "${file.type || 'unknown'}"`
                );
            } else {
                validFiles.push(file);
            }
        }

        if (errors.length > 0 && validFiles.length === 0) {
            this.errorMessage.set(
                `All files have issues: ${errors.join('; ')}`
            );
            return;
        }

        if (errors.length > 0) {
            this.errorMessage.set(
                `${errors.length} file(s) skipped: ${errors.join('; ')}`
            );
        }

        if (validFiles.length === 1) {
            // Fell back to single file
            this.selectedFile.set(validFiles[0]);
            this.selectedFiles.set(validFiles);
            this.selectedFormat.set('');
            return;
        }

        this.selectedFiles.set(validFiles);
        this.selectedFile.set(null); // Multi-file mode, no single file
    }

    /** Remove a specific file from the multi-file selection */
    removeFile(index: number): void {
        const files = [...this.selectedFiles()];
        files.splice(index, 1);

        if (files.length === 0) {
            this.reset(true);
        } else if (files.length === 1) {
            // Fall back to single-file mode
            this.reset(false);
            this.selectedFile.set(files[0]);
            this.selectedFiles.set(files);
            this.selectedFormat.set('');
        } else {
            this.selectedFiles.set(files);
            // Reset mode if merge is no longer valid
            if (this.processingMode() === 'merge' && !canMerge(files).length) {
                this.processingMode.set(null);
            }
        }
    }

    fileSizeMb(): string {
        const file = this.selectedFile();
        if (!file) return '';
        return (file.size / 1024 / 1024).toFixed(2);
    }

    fileSizeMbOf(file: File): string {
        return (file.size / 1024 / 1024).toFixed(2);
    }

    totalSizeMb(): string {
        const total = this.selectedFiles().reduce((sum, f) => sum + f.size, 0);
        return (total / 1024 / 1024).toFixed(2);
    }

    setProcessingMode(mode: ProcessingMode): void {
        this.processingMode.set(mode);
        this.selectedMergeFormat.set('');
        this.selectedBatchFormat.set('');
    }

    // ─── Conversion ──────────────────────────────────────────────────────────

    async convert(): Promise<void> {
        const file = this.selectedFile();
        const format = this.selectedFormat();

        if (!file || !format) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.result.set(null);

        try {
            let conversionResult: ConversionResult;

            switch (format) {
                // Images
                case 'png-to-jpg': conversionResult = await this.converterSvc.pngToJpg(file); break;
                case 'jpg-to-png': conversionResult = await this.converterSvc.jpgToPng(file); break;
                case 'image-to-webp': conversionResult = await this.converterSvc.imageToWebp(file); break;
                case 'webp-to-png': conversionResult = await this.converterSvc.webpToPng(file); break;
                case 'webp-to-jpg': conversionResult = await this.converterSvc.webpToJpg(file); break;
                case 'heic-to-jpg': conversionResult = await this.converterSvc.heicToJpg(file); break;
                case 'svg-to-png': conversionResult = await this.converterSvc.svgToPng(file); break;
                case 'svg-to-jpg': conversionResult = await this.converterSvc.svgToJpg(file); break;
                // PDF
                case 'pdf-to-png': conversionResult = await this.converterSvc.pdfToPng(file); break;
                case 'pdf-to-jpg': conversionResult = await this.converterSvc.pdfToJpg(file); break;
                case 'pdf-to-txt': conversionResult = await this.converterSvc.pdfToTxt(file); break;
                case 'image-to-pdf': conversionResult = await this.converterSvc.imageToPdf(file); break;

                // Data
                case 'csv-to-xlsx': conversionResult = await this.converterSvc.csvToXlsx(file); break;
                case 'xlsx-to-csv': conversionResult = await this.converterSvc.xlsxToCsv(file); break;
                case 'csv-to-json': conversionResult = await this.converterSvc.csvToJson(file); break;
                case 'json-to-csv': conversionResult = await this.converterSvc.jsonToCsv(file); break;
                case 'json-to-xml': conversionResult = await this.converterSvc.jsonToXml(file); break;
                case 'xml-to-json': conversionResult = await this.converterSvc.xmlToJson(file); break;
                case 'json-to-yaml': conversionResult = await this.converterSvc.jsonToYaml(file); break;
                case 'yaml-to-json': conversionResult = await this.converterSvc.yamlToJson(file); break;
                case 'json-to-toml': conversionResult = await this.converterSvc.jsonToToml(file); break;
                case 'json-to-bson': conversionResult = await this.converterSvc.jsonToBson(file); break;
                case 'json-to-xlsx': conversionResult = await this.converterSvc.jsonToXlsx(file); break;
                case 'json-to-ini': conversionResult = await this.converterSvc.jsonToIni(file); break;
                case 'csv-to-tsv': conversionResult = await this.converterSvc.csvToTsv(file); break;
                case 'json-to-env': conversionResult = await this.converterSvc.jsonToEnv(file); break;
                case 'txt-to-csv': conversionResult = await this.converterSvc.txtToCsv(file); break;
                case 'txt-to-json': conversionResult = await this.converterSvc.txtToJson(file); break;

                // Documents
                case 'docx-to-html': conversionResult = await this.converterSvc.docxToHtml(file); break;
                case 'docx-to-txt': conversionResult = await this.converterSvc.docxToTxt(file); break;
                case 'docx-to-pdf': conversionResult = await this.converterSvc.docxToPdf(file); break;
                case 'markdown-to-html': conversionResult = await this.converterSvc.markdownToHtml(file); break;
                case 'html-to-markdown': conversionResult = await this.converterSvc.htmlToMarkdown(file); break;

                // Archive
                case 'zip-extract': conversionResult = await this.converterSvc.zipExtract(file); break;

                default:
                    throw new Error(`Unknown conversion type: ${format}`);
            }

            this.result.set(conversionResult);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
            this.errorMessage.set(`Conversion failed: ${msg}`);
        } finally {
            this.isLoading.set(false);
        }
    }

    // ─── Batch Conversion ────────────────────────────────────────────────────

    async convertBatch(): Promise<void> {
        const files = this.selectedFiles();
        const mode = this.processingMode();
        if (files.length < 2 || !mode) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.batchResult.set(null);

        try {
            if (mode === 'merge') {
                await this.convertMerge(files);
            } else {
                await this.convertSeparate(files);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
            this.errorMessage.set(`Batch conversion failed: ${msg}`);
        } finally {
            this.isLoading.set(false);
        }
    }

    private async convertMerge(files: File[]): Promise<void> {
        const format = this.selectedMergeFormat();
        if (!format) return;

        // Initialize file states for progress tracking
        this.fileStates.set(
            files.map((f) => ({ file: f, status: 'converting' as const }))
        );

        let result: ConversionResult;

        switch (format) {
            case 'images-to-pdf':
                result = await this.converterSvc.imagesToPdf(files);
                break;
            default:
                throw new Error(`Unknown merge conversion: ${format}`);
        }

        // Mark all as done
        this.fileStates.set(
            files.map((f) => ({ file: f, status: 'done' as const }))
        );

        this.batchResult.set({
            blob: result.blob,
            filename: result.filename,
            mode: 'merge',
            fileCount: files.length,
        });
    }

    private async convertSeparate(files: File[]): Promise<void> {
        const format = this.selectedBatchFormat();
        if (!format) return;

        // Initialize file states
        const states: FileItemState[] = files.map((f) => ({
            file: f,
            status: 'pending' as const,
        }));
        this.fileStates.set([...states]);

        const results: ConversionResult[] = [];

        // Process sequentially to avoid browser memory exhaustion
        for (let i = 0; i < files.length; i++) {
            // Mark current as converting
            states[i] = { ...states[i], status: 'converting' };
            this.fileStates.set([...states]);

            try {
                // Reuse single-file conversion logic by temporarily setting selectedFile
                const singleResult = await this.convertSingleFile(
                    files[i],
                    format
                );
                states[i] = {
                    ...states[i],
                    status: 'done',
                    result: singleResult,
                };
                results.push(singleResult);
            } catch (err: unknown) {
                const msg =
                    err instanceof Error ? err.message : 'Conversion failed';
                states[i] = { ...states[i], status: 'error', error: msg };
            }

            this.fileStates.set([...states]);
        }

        if (results.length === 0) {
            throw new Error('All file conversions failed.');
        }

        // Bundle results into ZIP
        const zipResult = await this.converterSvc.bundleAsZip(results);

        this.batchResult.set({
            blob: zipResult.blob,
            filename: zipResult.filename,
            mode: 'separate',
            fileCount: results.length,
        });
    }

    /**
     * Convert a single file using the same logic as the convert() method.
     * Extracted to avoid code duplication between single and batch flows.
     */
    private async convertSingleFile(
        file: File,
        format: string
    ): Promise<ConversionResult> {
        switch (format) {
            case 'png-to-jpg': return this.converterSvc.pngToJpg(file);
            case 'jpg-to-png': return this.converterSvc.jpgToPng(file);
            case 'image-to-webp': return this.converterSvc.imageToWebp(file);
            case 'webp-to-png': return this.converterSvc.webpToPng(file);
            case 'webp-to-jpg': return this.converterSvc.webpToJpg(file);
            case 'heic-to-jpg': return this.converterSvc.heicToJpg(file);
            case 'svg-to-png': return this.converterSvc.svgToPng(file);
            case 'svg-to-jpg': return this.converterSvc.svgToJpg(file);
            case 'pdf-to-png': return this.converterSvc.pdfToPng(file);
            case 'pdf-to-jpg': return this.converterSvc.pdfToJpg(file);
            case 'pdf-to-txt': return this.converterSvc.pdfToTxt(file);
            case 'image-to-pdf': return this.converterSvc.imageToPdf(file);
            case 'csv-to-xlsx': return this.converterSvc.csvToXlsx(file);
            case 'xlsx-to-csv': return this.converterSvc.xlsxToCsv(file);
            case 'csv-to-json': return this.converterSvc.csvToJson(file);
            case 'json-to-csv': return this.converterSvc.jsonToCsv(file);
            case 'json-to-xml': return this.converterSvc.jsonToXml(file);
            case 'xml-to-json': return this.converterSvc.xmlToJson(file);
            case 'json-to-yaml': return this.converterSvc.jsonToYaml(file);
            case 'yaml-to-json': return this.converterSvc.yamlToJson(file);
            case 'json-to-toml': return this.converterSvc.jsonToToml(file);
            case 'json-to-bson': return this.converterSvc.jsonToBson(file);
            case 'json-to-xlsx': return this.converterSvc.jsonToXlsx(file);
            case 'json-to-ini': return this.converterSvc.jsonToIni(file);
            case 'csv-to-tsv': return this.converterSvc.csvToTsv(file);
            case 'json-to-env': return this.converterSvc.jsonToEnv(file);
            case 'txt-to-csv': return this.converterSvc.txtToCsv(file);
            case 'txt-to-json': return this.converterSvc.txtToJson(file);
            case 'docx-to-html': return this.converterSvc.docxToHtml(file);
            case 'docx-to-txt': return this.converterSvc.docxToTxt(file);
            case 'docx-to-pdf': return this.converterSvc.docxToPdf(file);
            case 'markdown-to-html': return this.converterSvc.markdownToHtml(file);
            case 'html-to-markdown': return this.converterSvc.htmlToMarkdown(file);
            case 'zip-extract': return this.converterSvc.zipExtract(file);
            default:
                throw new Error(`Unknown conversion type: ${format}`);
        }
    }

    // ─── Download ─────────────────────────────────────────────────────────────

    download(): void {
        const res = this.result();
        if (res) {
            saveAs(res.blob, res.filename);
            return;
        }
        const batch = this.batchResult();
        if (batch) {
            saveAs(batch.blob, batch.filename);
        }
    }

    // ─── Reset ────────────────────────────────────────────────────────────────

    /** Full reset – clears all state */
    reset(clearFile = true): void {
        if (clearFile) {
            this.selectedFile.set(null);
            this.selectedFiles.set([]);
        }
        this.selectedFormat.set('');
        this.processingMode.set(null);
        this.selectedMergeFormat.set('');
        this.selectedBatchFormat.set('');
        this.errorMessage.set(null);
        this.result.set(null);
        this.batchResult.set(null);
        this.fileStates.set([]);
        this.isLoading.set(false);
    }
}
