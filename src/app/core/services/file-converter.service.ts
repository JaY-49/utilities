import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import { ConversionResult } from '../models/file-converter.models';

@Injectable({ providedIn: 'root' })
export class FileConverterService {

    // ─── Image Conversions (Canvas API) ───────────────────────────────────────

    /** Converts a PNG file to JPG (quality 0.92) */
    async pngToJpg(file: File): Promise<ConversionResult> {
        const blob = await this.convertImageFormat(file, 'image/jpeg', 0.92);
        return { blob, filename: this.replaceExtension(file.name, 'jpg') };
    }

    /** Converts a JPG/JPEG file to PNG */
    async jpgToPng(file: File): Promise<ConversionResult> {
        const blob = await this.convertImageFormat(file, 'image/png');
        return { blob, filename: this.replaceExtension(file.name, 'png') };
    }

    /**
     * Core canvas-based image format conversion.
     * Draws the image onto an off-screen canvas and exports to the target MIME.
     */
    private convertImageFormat(
        file: File,
        targetMime: string,
        quality?: number
    ): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    reject(new Error('Canvas context unavailable'));
                    return;
                }

                // White background is important for JPG (no alpha channel)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas toBlob returned null'));
                    },
                    targetMime,
                    quality
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    // ─── Image → PDF ──────────────────────────────────────────────────────────

    /** Embeds a raster image (PNG/JPG) into a jsPDF document */
    async imageToRgbPdf(file: File): Promise<ConversionResult> {
        const dataUrl = await this.fileToDataUrl(file);

        // Determine image dimensions via Image element
        const { width, height } = await this.getImageDimensions(dataUrl);

        // A4 in mm, portrait only; scale image to fit width preserving aspect ratio
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 10;
        const availableWidth = pageWidth - margin * 2;
        const scale = availableWidth / width;
        const scaledWidth = availableWidth;
        const scaledHeight = height * scale;

        const orientation = scaledHeight > pageHeight ? 'p' : 'p';
        const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

        const format = file.type === 'image/png' ? 'PNG' : 'JPEG';
        doc.addImage(dataUrl, format, margin, margin, scaledWidth, scaledHeight);

        const blob = doc.output('blob');
        return { blob, filename: this.replaceExtension(file.name, 'pdf') };
    }

    // ─── CSV ↔ XLSX ────────────────────────────────────────────────────────────

    /** Parses CSV via PapaParse, writes to XLSX via SheetJS */
    async csvToXlsx(file: File): Promise<ConversionResult> {
        const text = await file.text();

        // PapaParse synchronous parse returning array-of-arrays
        const result = Papa.parse<string[]>(text, {
            skipEmptyLines: true,
        });

        if (result.errors.length > 0) {
            throw new Error(`CSV parse error: ${result.errors[0].message}`);
        }

        const worksheet = XLSX.utils.aoa_to_sheet(result.data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

        // Write to ArrayBuffer, then convert to Blob
        const arrayBuffer = XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'array',
        }) as ArrayBuffer;

        const blob = new Blob([arrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        return { blob, filename: this.replaceExtension(file.name, 'xlsx') };
    }

    /** Reads XLSX via SheetJS, exports first sheet as CSV */
    async xlsxToCsv(file: File): Promise<ConversionResult> {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Use the first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error('Workbook contains no sheets');

        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        return { blob, filename: this.replaceExtension(file.name, 'csv') };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fileToDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(file);
        });
    }

    private getImageDimensions(
        dataUrl: string
    ): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => reject(new Error('Cannot read image dimensions'));
            img.src = dataUrl;
        });
    }

    private replaceExtension(filename: string, newExt: string): string {
        return filename.replace(/\.[^.]+$/, '') + '.' + newExt;
    }
}
