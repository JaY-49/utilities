import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';

import { PdfProcessingService } from '../../core/services/pdf-processing.service';
import { DownloadService } from '../../core/services/download.service';
import {
    ToolDefinition, FileItem, ProcessingResult, ProcessingStatus,
    createFileItem, formatFileSize
} from '../../core/models/file-tools.models';

const PDF_MIMES = ['application/pdf'];
const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];

const PDF_TOOLS: ToolDefinition[] = [
    { id: 'merge', name: 'Merge PDF', description: 'Combine multiple PDFs into one document', icon: 'files-medical', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)', acceptedMimes: PDF_MIMES, maxFiles: 20, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'split', name: 'Split PDF', description: 'Extract specific pages or ranges', icon: 'distribute-spacing-horizontal', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', acceptedMimes: PDF_MIMES, maxFiles: 1, maxFileSizeMb: 500, supportsMultiFile: false },
    { id: 'compress', name: 'Compress PDF', description: 'Reduce PDF file size', icon: 'down-from-bracket', gradient: 'linear-gradient(135deg, #10b981, #34d399)', acceptedMimes: PDF_MIMES, maxFiles: 10, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'pdf-to-image', name: 'PDF to Image', description: 'Convert PDF pages to PNG or JPG', icon: 'share-from-square', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', acceptedMimes: PDF_MIMES, maxFiles: 5, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'pdf-to-text', name: 'PDF to Text', description: 'Extract text content from PDF', icon: 'file', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', acceptedMimes: PDF_MIMES, maxFiles: 5, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'images-to-pdf', name: 'Images to PDF', description: 'Create a PDF from image files', icon: 'file-heart', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)', acceptedMimes: IMAGE_MIMES, maxFiles: 30, maxFileSizeMb: 500, supportsMultiFile: true },
];

@Component({
    selector: 'app-pdf-tools',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule,
        MatButtonModule, MatIconModule, MatProgressBarModule,
        MatSelectModule, MatFormFieldModule, MatInputModule,
        MatChipsModule, MatTooltipModule, MatSliderModule,
    ],
    templateUrl: './pdf-tools.component.html',
})
export class PdfToolsComponent {
    private readonly pdfSvc = inject(PdfProcessingService);
    private readonly downloadSvc = inject(DownloadService);

    // ─── State ────────────────────────────────────────────────────────────────
    readonly tools = PDF_TOOLS;
    selectedTool = signal<ToolDefinition | null>(null);
    files = signal<FileItem[]>([]);
    status = signal<ProcessingStatus>('idle');
    errorMessage = signal<string | null>(null);
    results = signal<ProcessingResult[]>([]);
    isDragOver = signal(false);

    // Tool-specific options
    splitRange = signal('');
    imageFormat = signal<'png' | 'jpg'>('png');
    rotationDegrees = signal(90);
    compressQuality = signal(0.7);

    readonly formatFileSize = formatFileSize;
    readonly activeTool = computed(() => this.selectedTool());
    readonly hasFiles = computed(() => this.files().length > 0);
    readonly totalSize = computed(() => this.files().reduce((sum, f) => sum + f.file.size, 0));

    // ─── Tool Selection ───────────────────────────────────────────────────────

    selectTool(tool: ToolDefinition): void {
        this.selectedTool.set(tool);
        this.resetState();
    }

    backToDashboard(): void {
        this.selectedTool.set(null);
        this.resetState();
    }

    // ─── File Handlers ────────────────────────────────────────────────────────

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        this.addFiles(Array.from(input.files));
        input.value = '';
    }

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
        if (event.dataTransfer?.files.length) {
            this.addFiles(Array.from(event.dataTransfer.files));
        }
    }

    private addFiles(newFiles: File[]): void {
        const tool = this.activeTool();
        if (!tool) return;

        const currentFiles = this.files();
        const validFiles: FileItem[] = [];

        for (const file of newFiles) {
            if (currentFiles.length + validFiles.length >= tool.maxFiles) break;

            if (file.size > tool.maxFileSizeMb * 1024 * 1024) {
                this.errorMessage.set(`File ${file.name} exceeds ${tool.maxFileSizeMb}MB limit.`);
                continue;
            }

            if (!tool.acceptedMimes.includes(file.type)) {
                // PDF processing handles some variation in mime types
                if (tool.id !== 'images-to-pdf' && file.type !== 'application/pdf') {
                    continue;
                }
            }

            validFiles.push(createFileItem(file));
        }

        if (tool.supportsMultiFile) {
            this.files.set([...currentFiles, ...validFiles]);
        } else if (validFiles.length > 0) {
            this.files.set([validFiles[0]]);
        }
    }

    removeFile(id: string): void {
        this.files.set(this.files().filter(f => f.id !== id));
    }

    // ─── Processing ───────────────────────────────────────────────────────────

    async process(): Promise<void> {
        const tool = this.activeTool();
        const rawFiles = this.files().map(f => f.file);

        if (!tool || rawFiles.length === 0) return;

        this.status.set('processing');
        this.errorMessage.set(null);

        try {
            let res: ProcessingResult[] = [];

            switch (tool.id) {
                case 'merge':
                    res = [await this.pdfSvc.mergePdfs(rawFiles)];
                    break;
                case 'split':
                    res = await this.pdfSvc.splitPdf(rawFiles[0], this.splitRange());
                    break;
                case 'compress':
                    for (const f of rawFiles) res.push(await this.pdfSvc.compressPdf(f, this.compressQuality()));
                    break;
                case 'pdf-to-image':
                    for (const f of rawFiles) res.push(...await this.pdfSvc.pdfToImages(f, this.imageFormat()));
                    break;
                case 'pdf-to-text':
                    for (const f of rawFiles) res.push(await this.pdfSvc.pdfToText(f));
                    break;
                case 'images-to-pdf':
                    res = [await this.pdfSvc.imagesToPdf(rawFiles)];
                    break;
                case 'rotate':
                    for (const f of rawFiles) res.push(await this.pdfSvc.rotatePdfPages(f, this.rotationDegrees()));
                    break;
            }

            this.results.set(res);
            this.status.set('done');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Processing failed';
            this.errorMessage.set(msg);
            this.status.set('error');
        }
    }

    // ─── Download ─────────────────────────────────────────────────────────────

    downloadAll(): void {
        const res = this.results();
        if (res.length === 0) return;
        if (res.length === 1) {
            this.downloadSvc.downloadSingle(res[0].blob, res[0].filename);
        } else {
            this.downloadSvc.downloadAsZip(res, 'pdf-results.zip');
        }
    }

    downloadSingle(r: ProcessingResult): void {
        this.downloadSvc.downloadSingle(r.blob, r.filename);
    }

    // ─── Reset ────────────────────────────────────────────────────────────────

    resetState(): void {
        this.files.set([]);
        this.status.set('idle');
        this.errorMessage.set(null);
        this.results.set([]);
        this.splitRange.set('');
        this.imageFormat.set('png');
        this.rotationDegrees.set(90);
        this.compressQuality.set(0.7);
    }

    startOver(): void {
        this.resetState();
    }
}
