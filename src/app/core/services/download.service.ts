import { Injectable } from '@angular/core';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { ProcessingResult } from '../models/file-tools.models';

@Injectable({ providedIn: 'root' })
export class DownloadService {

    /** Download a single file */
    downloadSingle(blob: Blob, filename: string): void {
        saveAs(blob, filename);
    }

    /** Bundle multiple results into a ZIP and trigger download */
    async downloadAsZip(results: ProcessingResult[], zipName = 'files.zip'): Promise<void> {
        const zip = new JSZip();
        const nameCount = new Map<string, number>();

        for (const r of results) {
            let name = r.filename;
            const count = nameCount.get(name) ?? 0;
            if (count > 0) {
                const dotIdx = name.lastIndexOf('.');
                const base = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
                const ext = dotIdx >= 0 ? name.slice(dotIdx) : '';
                name = `${base} (${count})${ext}`;
            }
            nameCount.set(r.filename, count + 1);
            zip.file(name, r.blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, zipName);
    }
}
