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
import { MatChipsModule } from '@angular/material/chips';
import { saveAs } from 'file-saver';

import { FileConverterService } from '../../core/services/file-converter.service';
import {
    ALLOWED_MIME_TYPES,
    CONVERSION_MAP,
    ConversionOption,
    ConversionResult,
    MAX_FILE_SIZE_BYTES,
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
        MatChipsModule,
    ],
    templateUrl: './file-converter.component.html',
})
export class FileConverterComponent {
    private readonly converterSvc = inject(FileConverterService);

    // ─── State signals ───────────────────────────────────────────────────────
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
        const file = event.dataTransfer?.files[0];
        if (file) this.processFile(file);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) this.processFile(file);
        // Reset input value so the same file can be re-selected after reset
        input.value = '';
    }

    // ─── File validation & processing ────────────────────────────────────────

    private processFile(file: File): void {
        this.reset(false); // clear previous result but keep the UI

        // 1. Check file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            this.errorMessage.set(
                `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${this.maxSizeMb} MB.`
            );
            return;
        }

        // 2. Check MIME type
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            this.errorMessage.set(
                `Unsupported file type: "${file.type || 'unknown'}". ` +
                `Accepted types: PNG, JPG, CSV, XLSX.`
            );
            return;
        }

        this.selectedFile.set(file);
        this.selectedFormat.set(''); // reset target format selection
    }

    fileSizeMb(): string {
        const file = this.selectedFile();
        if (!file) return '';
        return (file.size / 1024 / 1024).toFixed(2);
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
                case 'png-to-jpg':
                    conversionResult = await this.converterSvc.pngToJpg(file);
                    break;
                case 'jpg-to-png':
                    conversionResult = await this.converterSvc.jpgToPng(file);
                    break;
                case 'image-to-pdf':
                    conversionResult = await this.converterSvc.imageToRgbPdf(file);
                    break;
                case 'csv-to-xlsx':
                    conversionResult = await this.converterSvc.csvToXlsx(file);
                    break;
                case 'xlsx-to-csv':
                    conversionResult = await this.converterSvc.xlsxToCsv(file);
                    break;
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

    // ─── Download ─────────────────────────────────────────────────────────────

    download(): void {
        const res = this.result();
        if (!res) return;
        saveAs(res.blob, res.filename);
    }

    // ─── Reset ────────────────────────────────────────────────────────────────

    /** Full reset – clears all state */
    reset(clearFile = true): void {
        if (clearFile) this.selectedFile.set(null);
        this.selectedFormat.set('');
        this.errorMessage.set(null);
        this.result.set(null);
        this.isLoading.set(false);
    }
}
