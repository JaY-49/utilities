import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JsonNodeComponent } from './json-node.component';

interface JsonStats {
    type: string;
    itemCount: number;
    depth: number;
    allKeys: string[];
    fileSize: number;
}

@Component({
    selector: 'app-json-tool',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTooltipModule,
        JsonNodeComponent,
    ],
    templateUrl: './json-tool.component.html'
})
export class JsonToolComponent {
    /** The raw JSON string from input */
    rawInput = signal<string>('');
    /** Parsed JSON data */
    parsedData = signal<any>(null);
    /** Error message if JSON is invalid */
    error = signal<string | null>(null);
    /** Toggle between 'tree' and 'text' view */
    viewMode = signal<'tree' | 'text'>('tree');

    /** The formatted version of the current JSON */
    formattedJson = computed(() => {
        const data = this.parsedData();
        return data ? JSON.stringify(data, null, 4) : '';
    });

    /** Compute statistics from the parsed data */
    stats = computed<JsonStats | null>(() => {
        const data = this.parsedData();
        if (data === null) return null;

        const keys = new Set<string>();
        let maxDepth = 0;

        const traverse = (obj: any, currentDepth: number) => {
            maxDepth = Math.max(maxDepth, currentDepth);
            if (obj && typeof obj === 'object') {
                Object.keys(obj).forEach(key => {
                    keys.add(key);
                    traverse(obj[key], currentDepth + 1);
                });
            }
        };

        traverse(data, 1);

        return {
            type: Array.isArray(data) ? 'Array' : typeof data === 'object' ? 'Object' : typeof data,
            itemCount: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
            depth: maxDepth,
            allKeys: Array.from(keys).sort(),
            fileSize: new Blob([this.rawInput()]).size
        };
    });

    /** Analyze the input JSON */
    analyze(): void {
        let input = this.rawInput().trim();
        if (!input) {
            this.error.set(null);
            this.parsedData.set(null);
            return;
        }

        try {
            let data = this.parseJsonLikeInput(input);

            // If the result is a string, try to parse it again (handles escaped JSON)
            if (typeof data === 'string') {
                try {
                    const nestedData = this.parseJsonLikeInput(data);
                    // Only use it if it actually parsed into an object or array
                    if (nestedData && typeof nestedData === 'object') {
                        data = nestedData;
                    }
                } catch (e) {
                    // Not valid nested JSON, keep as a string
                }
            }

            this.parsedData.set(data);
            this.error.set(null);
        } catch (e: any) {
            this.error.set('Invalid JSON format: ' + e.message);
            this.parsedData.set(null);
        }
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

    /** Format the text inside the input box */
    formatInput(): void {
        this.analyze();
        const data = this.parsedData();
        if (data) {
            this.rawInput.set(JSON.stringify(data, null, 4));
        }
    }

    /** Reset everything */
    clear(): void {
        this.rawInput.set('');
        this.parsedData.set(null);
        this.error.set(null);
    }

    /** Copy formatted JSON to clipboard */
    copyFormatted(): void {
        const data = this.parsedData();
        if (!data) return;
        const formatted = JSON.stringify(data, null, 4);
        navigator.clipboard.writeText(formatted);
    }

    /** Helper to format file size */
    formatSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
}
