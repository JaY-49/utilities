import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
    selector: 'app-csv-json',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatButtonToggleModule,
    ],
    templateUrl: './csv-json.component.html'
})
export class CsvJsonComponent {
    mode = signal<'csv-to-json' | 'json-to-csv'>('csv-to-json');
    input = signal('');
    output = signal('');
    error = signal<string | null>(null);
    delimiter = signal(',');

    convert(): void {
        this.error.set(null);
        this.output.set('');

        try {
            if (this.mode() === 'csv-to-json') {
                this.csvToJson();
            } else {
                this.jsonToCsv();
            }
        } catch (e: any) {
            this.error.set(e.message || 'Conversion failed');
        }
    }

    private csvToJson(): void {
        const text = this.input().trim();
        if (!text) throw new Error('Input is empty');

        const delim = this.delimiter() || ',';
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row');

        const headers = this.parseCsvLine(lines[0], delim);
        const result: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i], delim);
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => {
                obj[h] = values[idx] ?? '';
            });
            result.push(obj);
        }

        this.output.set(JSON.stringify(result, null, 2));
    }

    private jsonToCsv(): void {
        const text = this.input().trim();
        if (!text) throw new Error('Input is empty');

        const data = this.parseJsonLikeInput(text);
        if (!Array.isArray(data)) throw new Error('JSON must be an array of objects');
        if (data.length === 0) throw new Error('JSON array is empty');

        const delim = this.delimiter() || ',';
        const headers = Object.keys(data[0]);
        const rows: string[] = [headers.join(delim)];

        for (const item of data) {
            const values = headers.map(h => {
                const val = String(item[h] ?? '');
                // Wrap in quotes if it contains the delimiter or quotes
                if (val.includes(delim) || val.includes('"') || val.includes('\n')) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            });
            rows.push(values.join(delim));
        }

        this.output.set(rows.join('\n'));
    }

    private parseJsonLikeInput(input: string): any {
        try {
            return JSON.parse(input);
        } catch {
            return JSON.parse(this.quoteBareObjectKeys(input));
        }
    }

    private quoteBareObjectKeys(input: string): string {
        return input.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
    }

    private parseCsvLine(line: string, delim: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (inQuotes) {
                if (char === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    current += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === delim) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
        }
        result.push(current.trim());
        return result;
    }

    copy(): void {
        navigator.clipboard.writeText(this.output());
    }

    clear(): void {
        this.input.set('');
        this.output.set('');
        this.error.set(null);
    }

    swap(): void {
        const currentOutput = this.output();
        if (currentOutput) {
            this.input.set(currentOutput);
            this.output.set('');
            this.mode.update(m => m === 'csv-to-json' ? 'json-to-csv' : 'csv-to-json');
        }
    }
}
