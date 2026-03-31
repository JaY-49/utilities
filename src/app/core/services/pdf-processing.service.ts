import { Injectable } from '@angular/core';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ProcessingResult } from '../models/file-tools.models';

@Injectable({ providedIn: 'root' })
export class PdfProcessingService {
    constructor() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';
    }

    // ─── Merge PDFs ───────────────────────────────────────────────────────────

    async mergePdfs(files: File[]): Promise<ProcessingResult> {
        const merged = await PDFDocument.create();

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const doc = await PDFDocument.load(bytes);
            const pages = await merged.copyPages(doc, doc.getPageIndices());
            pages.forEach(page => merged.addPage(page));
        }

        const pdfBytes = await merged.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        return {
            blob,
            filename: 'merged.pdf',
            originalSize: totalSize,
            resultSize: blob.size,
        };
    }

    // ─── Split PDF ────────────────────────────────────────────────────────────

    async splitPdf(file: File, rangeStr: string): Promise<ProcessingResult[]> {
        const bytes = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes);
        const totalPages = srcDoc.getPageCount();
        const ranges = this.parseRanges(rangeStr, totalPages);
        const results: ProcessingResult[] = [];

        for (const range of ranges) {
            const newDoc = await PDFDocument.create();
            const indices = range.map(p => p - 1); // 0-indexed
            const pages = await newDoc.copyPages(srcDoc, indices);
            pages.forEach(page => newDoc.addPage(page));
            const pdfBytes = await newDoc.save();
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
            const label = range.length === 1 ? `page-${range[0]}` : `pages-${range[0]}-${range[range.length - 1]}`;
            results.push({
                blob,
                filename: `${this.baseName(file.name)}_${label}.pdf`,
                originalSize: file.size,
                resultSize: blob.size,
            });
        }

        return results;
    }

    // ─── Compress PDF ─────────────────────────────────────────────────────────

    async compressPdf(file: File, quality = 0.7): Promise<ProcessingResult> {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);

        // Strip metadata for size reduction
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
        doc.setProducer('');
        doc.setCreator('');

        const pdfBytes = await doc.save({
            useObjectStreams: quality < 0.8, // Better compression for medium/high levels
        });
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        return {
            blob,
            filename: this.addSuffix(file.name, 'compressed'),
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── PDF to Images ────────────────────────────────────────────────────────

    async pdfToImages(file: File, format: 'png' | 'jpg', dpi = 150): Promise<ProcessingResult[]> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const results: ProcessingResult[] = [];
        const scale = dpi / 72;
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d')!;

            // Fill white background for JPEG
            if (format === 'jpg') {
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, canvas.width, canvas.height);
            }

            await page.render({ canvasContext: context, viewport, canvas } as any).promise;

            const blob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed')), mime, 0.92)
            );

            results.push({
                blob,
                filename: `${this.baseName(file.name)}_page-${i}.${format}`,
                originalSize: file.size,
                resultSize: blob.size,
            });

            canvas.width = 0;
            canvas.height = 0;
        }

        return results;
    }

    // ─── PDF to Text ──────────────────────────────────────────────────────────

    async pdfToText(file: File): Promise<ProcessingResult> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(' ');
            text += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        const blob = new Blob([text], { type: 'text/plain' });
        return {
            blob,
            filename: this.baseName(file.name) + '.txt',
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Images to PDF ────────────────────────────────────────────────────────

    async imagesToPdf(files: File[]): Promise<ProcessingResult> {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pw = 210, ph = 297, margin = 10;
        const aw = pw - margin * 2, ah = ph - margin * 2;

        for (let i = 0; i < files.length; i++) {
            if (i > 0) doc.addPage();
            const dataUrl = await this.fileToDataUrl(files[i]);
            const { width, height } = await this.getImageDimensions(dataUrl);
            const scale = Math.min(aw / width, ah / height);
            const sw = width * scale, sh = height * scale;
            const x = margin + (aw - sw) / 2, y = margin + (ah - sh) / 2;
            doc.addImage(dataUrl, 'JPEG', x, y, sw, sh);
        }

        const blob = doc.output('blob');
        const totalSize = files.reduce((s, f) => s + f.size, 0);
        return {
            blob,
            filename: 'images.pdf',
            originalSize: totalSize,
            resultSize: blob.size,
        };
    }

    // ─── Rotate PDF Pages ─────────────────────────────────────────────────────

    async rotatePdfPages(file: File, rotationDegrees: number): Promise<ProcessingResult> {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);

        doc.getPages().forEach(page => {
            page.setRotation(degrees(page.getRotation().angle + rotationDegrees));
        });

        const pdfBytes = await doc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        return {
            blob,
            filename: this.addSuffix(file.name, 'rotated'),
            originalSize: file.size,
            resultSize: blob.size,
        };
    }

    // ─── Get page count (for UI) ──────────────────────────────────────────────

    async getPageCount(file: File): Promise<number> {
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        return doc.getPageCount();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private parseRanges(rangeStr: string, maxPage: number): number[][] {
        const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean);
        const ranges: number[][] = [];

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                const s = Math.max(1, Math.min(start, maxPage));
                const e = Math.max(1, Math.min(end, maxPage));
                const pages: number[] = [];
                for (let i = s; i <= e; i++) pages.push(i);
                if (pages.length) ranges.push(pages);
            } else {
                const p = Number(part);
                if (p >= 1 && p <= maxPage) ranges.push([p]);
            }
        }

        return ranges.length ? ranges : [[...Array(maxPage)].map((_, i) => i + 1)];
    }

    private baseName(filename: string): string {
        return filename.replace(/\.[^.]+$/, '');
    }

    private addSuffix(filename: string, suffix: string): string {
        const dotIdx = filename.lastIndexOf('.');
        if (dotIdx < 0) return filename + '_' + suffix;
        return filename.slice(0, dotIdx) + '_' + suffix + filename.slice(dotIdx);
    }

    private fileToDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(file);
        });
    }

    private getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(new Error('Cannot read image dimensions'));
            img.src = dataUrl;
        });
    }
}
