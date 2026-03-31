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
import { MatCheckboxModule } from '@angular/material/checkbox';

import { ImageProcessingService } from '../../core/services/image-processing.service';
import { DownloadService } from '../../core/services/download.service';
import {
    ToolDefinition, FileItem, ProcessingResult, ProcessingStatus,
    createFileItem, formatFileSize
} from '../../core/models/file-tools.models';

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];

const IMAGE_TOOLS: ToolDefinition[] = [
    { id: 'convert', name: 'Convert Image', description: 'Convert between PNG, JPG, and WEBP', icon: 'right-left-large', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', acceptedMimes: IMAGE_MIMES, maxFiles: 20, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'resize', name: 'Resize Image', description: 'Change image dimensions', icon: 'expand-wide', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)', acceptedMimes: IMAGE_MIMES, maxFiles: 20, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'compress', name: 'Compress Image', description: 'Reduce image file size', icon: 'down-from-bracket', gradient: 'linear-gradient(135deg, #10b981, #34d399)', acceptedMimes: IMAGE_MIMES, maxFiles: 20, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'rotate-flip', name: 'Rotate / Flip', description: 'Rotate or flip images', icon: 'arrows-retweet', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)', acceptedMimes: IMAGE_MIMES, maxFiles: 20, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'crop', name: 'Crop Image', description: 'Crop images to a selection', icon: 'crop-simple', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)', acceptedMimes: IMAGE_MIMES, maxFiles: 1, maxFileSizeMb: 500, supportsMultiFile: false },
    { id: 'enhance', name: 'Enhance Image', description: 'Adjust brightness, contrast & more', icon: 'sun-bright', gradient: 'linear-gradient(135deg, #f97316, #fb923c)', acceptedMimes: IMAGE_MIMES, maxFiles: 20, maxFileSizeMb: 500, supportsMultiFile: true },
    { id: 'upscale', name: 'Upscale Image', description: 'Enlarge images 2x, 3x or 4x', icon: 'circle-arrow-up', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)', acceptedMimes: IMAGE_MIMES, maxFiles: 10, maxFileSizeMb: 500, supportsMultiFile: true },
];

@Component({
    selector: 'app-image-tools',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule,
        MatButtonModule, MatIconModule, MatProgressBarModule,
        MatSelectModule, MatFormFieldModule, MatInputModule,
        MatChipsModule, MatTooltipModule, MatSliderModule,
        MatCheckboxModule,
    ],
    templateUrl: './image-tools.component.html',
})
export class ImageToolsComponent {
    private readonly imgSvc = inject(ImageProcessingService);
    private readonly downloadSvc = inject(DownloadService);

    // ─── State ────────────────────────────────────────────────────────────────
    readonly tools = IMAGE_TOOLS;
    selectedTool = signal<ToolDefinition | null>(null);
    files = signal<FileItem[]>([]);
    status = signal<ProcessingStatus>('idle');
    errorMessage = signal<string | null>(null);
    results = signal<ProcessingResult[]>([]);
    isDragOver = signal(false);
    previewUrl = signal<string | null>(null);

    // Tool-specific options
    targetFormat = signal('image/webp');
    convertQuality = signal(0.92);
    resizeWidth = signal(800);
    resizeHeight = signal(600);
    maintainRatio = signal(true);
    compressQuality = signal(0.7);
    rotateDegrees = signal(90);
    flipDirection = signal<'horizontal' | 'vertical'>('horizontal');
    cropX = signal(0);
    cropY = signal(0);
    cropW = signal(400);
    cropH = signal(300);
    brightness = signal(0);
    contrast = signal(0);
    saturation = signal(0);
    upscaleFactor = signal(2);

    // Original dimensions for calculations
    originalWidth = signal(0);
    originalHeight = signal(0);
    resizeScale = signal(100);

    readonly formatFileSize = formatFileSize;
    readonly activeTool = computed(() => this.selectedTool());
    readonly hasFiles = computed(() => this.files().length > 0);
    readonly totalSize = computed(() => this.files().reduce((sum, f) => sum + f.file.size, 0));

    // Dynamic preview styling
    readonly previewStyle = computed(() => {
        const tool = this.activeTool();
        if (!tool) return {};

        const styles: any = {
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transformOrigin: 'center center',
            maxWidth: '100%',
            maxHeight: '340px',
            objectFit: 'contain',
            borderRadius: '8px'
        };

        let transform = '';

        if (tool.id === 'rotate-flip') {
            transform += `rotate(${this.rotateDegrees()}deg) `;
            if (this.flipDirection() === 'horizontal') transform += 'scaleX(-1) ';
            if (this.flipDirection() === 'vertical') transform += 'scaleY(-1) ';
        }

        if (tool.id === 'enhance') {
            styles.filter = `brightness(${100 + this.brightness()}%) contrast(${100 + this.contrast()}%) saturate(${100 + this.saturation()}%)`;
        }

        styles.transform = transform.trim();
        return styles;
    });

    readonly cropOverlayStyle = computed(() => {
        if (this.activeTool()?.id !== 'crop' || !this.originalWidth()) return { display: 'none' };

        // Approximate scaling for the preview (since the img is object-contain)
        // We calculate percentages relative to the original dimensions
        const x = (this.cropX() / this.originalWidth()) * 100;
        const y = (this.cropY() / this.originalHeight()) * 100;
        const w = (this.cropW() / this.originalWidth()) * 100;
        const h = (this.cropH() / this.originalHeight()) * 100;

        return {
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: `${w}%`,
            height: `${h}%`,
            border: '2px dashed #6366f1',
            background: 'rgba(99, 102, 241, 0.1)',
            pointerEvents: 'none',
            zIndex: 10
        };
    });

    readonly formatOptions = [
        { label: 'WEBP', value: 'image/webp' },
        { label: 'PNG', value: 'image/png' },
        { label: 'JPG', value: 'image/jpeg' },
    ];

    // ─── Navigation ───────────────────────────────────────────────────────────

    selectTool(tool: ToolDefinition): void {
        this.selectedTool.set(tool);
        this.resetState();
    }

    backToDashboard(): void {
        this.cleanupPreview();
        this.selectedTool.set(null);
        this.resetState();
    }

    // ─── File handling ────────────────────────────────────────────────────────

    onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragOver.set(true); }
    onDragLeave(): void { this.isDragOver.set(false); }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.isDragOver.set(false);
        const fileList = event.dataTransfer?.files;
        if (fileList) this.addFiles(Array.from(fileList));
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) this.addFiles(Array.from(input.files));
        input.value = '';
    }

    addFiles(rawFiles: File[]): void {
        const tool = this.selectedTool();
        if (!tool) return;
        this.errorMessage.set(null);

        const maxSize = tool.maxFileSizeMb * 1024 * 1024;
        const errors: string[] = [];
        const valid: FileItem[] = [];

        for (const f of rawFiles) {
            if (!tool.acceptedMimes.includes(f.type)) {
                errors.push(`"${f.name}" is not a supported image type`);
            } else if (f.size > maxSize) {
                errors.push(`"${f.name}" exceeds ${tool.maxFileSizeMb} MB`);
            } else {
                valid.push(createFileItem(f));
            }
        }

        const current = this.files();
        const total = current.length + valid.length;
        if (total > tool.maxFiles) {
            errors.push(`Maximum ${tool.maxFiles} files allowed`);
            valid.splice(tool.maxFiles - current.length);
        }

        if (errors.length) this.errorMessage.set(errors.join('. '));
        if (valid.length) {
            this.files.update(prev => [...prev, ...valid]);
            // Generate preview for first image
            this.cleanupPreview();
            const firstFile = valid[0]?.file || this.files()[0]?.file;
            if (firstFile) {
                this.previewUrl.set(this.imgSvc.generatePreview(firstFile));

                // Set initial resize dimensions to match the actual image
                if (tool.id === 'resize') {
                    this.imgSvc.getImageDimensions(firstFile).then(dims => {
                        this.originalWidth.set(dims.width);
                        this.originalHeight.set(dims.height);
                        this.resizeWidth.set(dims.width);
                        this.resizeHeight.set(dims.height);
                        this.resizeScale.set(100);
                    });
                } else if (tool.id === 'crop') {
                    this.imgSvc.getImageDimensions(firstFile).then(dims => {
                        this.originalWidth.set(dims.width);
                        this.originalHeight.set(dims.height);
                        this.cropW.set(Math.min(dims.width, 400));
                        this.cropH.set(Math.min(dims.height, 300));
                        this.cropX.set(0);
                        this.cropY.set(0);
                    });
                }
            }
        }
    }

    onScaleChange(scale: number): void {
        this.resizeScale.set(scale);
        const w = Math.round((this.originalWidth() * scale) / 100);
        const h = Math.round((this.originalHeight() * scale) / 100);
        this.resizeWidth.set(w);
        this.resizeHeight.set(h);
    }

    removeFile(id: string): void {
        this.files.update(prev => prev.filter(f => f.id !== id));
        if (this.files().length === 0) {
            this.cleanupPreview();
        }
    }

    // ─── Processing ───────────────────────────────────────────────────────────

    async process(): Promise<void> {
        const tool = this.selectedTool();
        const items = this.files();
        if (!tool || items.length === 0) return;

        this.status.set('processing');
        this.errorMessage.set(null);
        this.results.set([]);

        try {
            const rawFiles = items.map(f => f.file);
            const res: ProcessingResult[] = [];

            switch (tool.id) {
                case 'convert':
                    for (const f of rawFiles) {
                        res.push(await this.imgSvc.convertFormat(f, this.targetFormat(), this.convertQuality()));
                    }
                    break;
                case 'resize':
                    for (const f of rawFiles) {
                        res.push(await this.imgSvc.resize(f, this.resizeWidth(), this.resizeHeight(), this.maintainRatio()));
                    }
                    break;
                case 'compress':
                    for (const f of rawFiles) {
                        res.push(await this.imgSvc.compress(f, this.compressQuality()));
                    }
                    break;
                case 'rotate-flip':
                    for (const f of rawFiles) {
                        let result = await this.imgSvc.rotate(f, this.rotateDegrees());
                        res.push(result);
                    }
                    break;
                case 'crop':
                    res.push(await this.imgSvc.crop(rawFiles[0], this.cropX(), this.cropY(), this.cropW(), this.cropH()));
                    break;
                case 'enhance':
                    for (const f of rawFiles) {
                        res.push(await this.imgSvc.enhance(f, this.brightness(), this.contrast(), this.saturation()));
                    }
                    break;
                case 'upscale':
                    for (const f of rawFiles) {
                        res.push(await this.imgSvc.upscale(f, this.upscaleFactor()));
                    }
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
            this.downloadSvc.downloadAsZip(res, 'image-results.zip');
        }
    }

    downloadSingle(r: ProcessingResult): void {
        this.downloadSvc.downloadSingle(r.blob, r.filename);
    }

    // ─── Flip action ──────────────────────────────────────────────────────────

    async flipImage(): Promise<void> {
        const items = this.files();
        if (items.length === 0) return;

        this.status.set('processing');
        this.errorMessage.set(null);
        this.results.set([]);

        try {
            const res: ProcessingResult[] = [];
            for (const item of items) {
                res.push(await this.imgSvc.flip(item.file, this.flipDirection()));
            }
            this.results.set(res);
            this.status.set('done');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Processing failed';
            this.errorMessage.set(msg);
            this.status.set('error');
        }
    }

    // ─── Reset ────────────────────────────────────────────────────────────────

    resetState(): void {
        this.files.set([]);
        this.status.set('idle');
        this.errorMessage.set(null);
        this.results.set([]);
        this.targetFormat.set('image/webp');
        this.convertQuality.set(0.92);
        this.resizeWidth.set(800);
        this.resizeHeight.set(600);
        this.maintainRatio.set(true);
        this.compressQuality.set(0.7);
        this.rotateDegrees.set(90);
        this.cropX.set(0);
        this.cropY.set(0);
        this.cropW.set(400);
        this.cropH.set(300);
        this.brightness.set(0);
        this.contrast.set(0);
        this.saturation.set(0);
        this.upscaleFactor.set(2);
    }

    startOver(): void {
        this.cleanupPreview();
        this.resetState();
    }

    private cleanupPreview(): void {
        const url = this.previewUrl();
        if (url) {
            this.imgSvc.revokePreview(url);
            this.previewUrl.set(null);
        }
    }
}
