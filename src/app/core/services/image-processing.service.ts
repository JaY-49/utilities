import { Injectable } from '@angular/core';
import { ProcessingResult } from '../models/file-tools.models';

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {

    // ─── Format Conversion ────────────────────────────────────────────────────

    async convertFormat(file: File, targetMime: string, quality = 0.92): Promise<ProcessingResult> {
        const { canvas, ctx } = await this.loadImageToCanvas(file);
        const blob = await this.canvasToBlob(canvas, targetMime, quality);
        const ext = this.mimeToExt(targetMime);
        this.disposeCanvas(canvas);
        return {
            blob,
            filename: this.replaceExt(file.name, ext),
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Resize ───────────────────────────────────────────────────────────────

    async resize(file: File, width: number, height: number, maintainRatio: boolean): Promise<ProcessingResult> {
        const img = await this.loadImage(file);
        let w = width;
        let h = height;
        if (maintainRatio) {
            const ratio = img.naturalWidth / img.naturalHeight;
            if (width && !height) h = Math.round(width / ratio);
            else if (height && !width) w = Math.round(height * ratio);
            else {
                const fitRatio = Math.min(width / img.naturalWidth, height / img.naturalHeight);
                w = Math.round(img.naturalWidth * fitRatio);
                h = Math.round(img.naturalHeight * fitRatio);
            }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        const mime = file.type || 'image/png';
        const blob = await this.canvasToBlob(canvas, mime, 0.92);
        this.disposeCanvas(canvas);
        return {
            blob,
            filename: file.name,
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Compress ─────────────────────────────────────────────────────────────

    async compress(file: File, quality: number): Promise<ProcessingResult> {
        const { canvas } = await this.loadImageToCanvas(file);
        
        // Use JPEG for compression as it supports the quality parameter effectively.
        // WebP is also an option, but JPEG is more universally expected for a generic 'Compress' tool.
        const targetMime = 'image/jpeg';
        const blob = await this.canvasToBlob(canvas, targetMime, quality);
        this.disposeCanvas(canvas);

        // If for some reason the "compressed" version is larger than the original,
        // it means the quality was set too high or the original was already highly optimized.
        if (blob.size >= file.size) {
            return {
                blob: file,
                filename: file.name,
                originalSize: file.size,
                resultSize: file.size,
            };
        }

        return {
            blob,
            filename: this.replaceExt(file.name, 'jpg'),
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Rotate ───────────────────────────────────────────────────────────────

    async rotate(file: File, degrees: number): Promise<ProcessingResult> {
        const img = await this.loadImage(file);
        const rad = (degrees * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        const w = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
        const h = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.translate(w / 2, h / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        const mime = file.type || 'image/png';
        const blob = await this.canvasToBlob(canvas, mime, 0.92);
        this.disposeCanvas(canvas);
        return {
            blob,
            filename: file.name,
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Flip ─────────────────────────────────────────────────────────────────

    async flip(file: File, direction: 'horizontal' | 'vertical'): Promise<ProcessingResult> {
        const { canvas, ctx } = await this.loadImageToCanvas(file);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d')!;

        if (direction === 'horizontal') {
            tCtx.translate(canvas.width, 0);
            tCtx.scale(-1, 1);
        } else {
            tCtx.translate(0, canvas.height);
            tCtx.scale(1, -1);
        }
        tCtx.drawImage(canvas, 0, 0);

        const mime = file.type || 'image/png';
        const blob = await this.canvasToBlob(tempCanvas, mime, 0.92);
        this.disposeCanvas(canvas);
        this.disposeCanvas(tempCanvas);
        return {
            blob,
            filename: file.name,
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Crop ─────────────────────────────────────────────────────────────────

    async crop(file: File, x: number, y: number, w: number, h: number): Promise<ProcessingResult> {
        const img = await this.loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

        const mime = file.type || 'image/png';
        const blob = await this.canvasToBlob(canvas, mime, 0.92);
        this.disposeCanvas(canvas);
        return {
            blob,
            filename: file.name,
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Enhance (Brightness / Contrast / Saturation / Sharpness) ─────────

    async enhance(
        file: File,
        brightness: number,
        contrast: number,
        saturation: number,
    ): Promise<ProcessingResult> {
        const { canvas, ctx } = await this.loadImageToCanvas(file);

        // Use CSS filter on a second canvas
        const outCanvas = document.createElement('canvas');
        outCanvas.width = canvas.width;
        outCanvas.height = canvas.height;
        const outCtx = outCanvas.getContext('2d')!;
        outCtx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;
        outCtx.drawImage(canvas, 0, 0);

        const mime = file.type || 'image/png';
        const blob = await this.canvasToBlob(outCanvas, mime, 0.92);
        this.disposeCanvas(canvas);
        this.disposeCanvas(outCanvas);
        return {
            blob,
            filename: file.name,
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Upscale ──────────────────────────────────────────────────────────────

    async upscale(file: File, factor: number): Promise<ProcessingResult> {
        const img = await this.loadImage(file);
        const w = img.naturalWidth * factor;
        const h = img.naturalHeight * factor;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        const mime = file.type || 'image/png';
        const blob = await this.canvasToBlob(canvas, mime, 0.92);
        this.disposeCanvas(canvas);
        return {
            blob,
            filename: this.addSuffix(file.name, `${factor}x`),
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Generate preview URL ─────────────────────────────────────────────────

    generatePreview(file: File): string {
        return URL.createObjectURL(file);
    }

    revokePreview(url: string): void {
        URL.revokeObjectURL(url);
    }

    async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        const img = await this.loadImage(file);
        return { width: img.naturalWidth, height: img.naturalHeight };
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    private loadImage(file: File): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
            img.src = url;
        });
    }

    private async loadImageToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
        const img = await this.loadImage(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return { canvas, ctx };
    }

    private canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null')),
                mime,
                quality,
            );
        });
    }

    private disposeCanvas(canvas: HTMLCanvasElement): void {
        canvas.width = 0;
        canvas.height = 0;
    }

    private mimeToExt(mime: string): string {
        const map: Record<string, string> = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'image/bmp': 'bmp',
        };
        return map[mime] ?? 'png';
    }

    private replaceExt(filename: string, ext: string): string {
        return filename.replace(/\.[^.]+$/, '') + '.' + ext;
    }

    private addSuffix(filename: string, suffix: string): string {
        const dotIdx = filename.lastIndexOf('.');
        if (dotIdx < 0) return filename + '_' + suffix;
        return filename.slice(0, dotIdx) + '_' + suffix + filename.slice(dotIdx);
    }
}
