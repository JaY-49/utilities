import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

@Component({
    selector: 'app-column-aligner',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatSelectModule,
    ],
    templateUrl: './column-aligner.component.html'
})
export class ColumnAlignerComponent {
    input = signal('');
    delimiter = signal('auto');
    alignment = signal<'left' | 'right' | 'center'>('left');

    output = computed(() => {
        const text = this.input().trim();
        if (!text) return '';

        const lines = text.split('\n');
        const delimRegex = this.getDelimiterRegex();

        // Parse into columns
        const rows = lines.map(line => line.split(delimRegex).map(c => c.trim()));

        // Find max columns
        const maxCols = Math.max(...rows.map(r => r.length));

        // Find max width per column
        const colWidths: number[] = [];
        for (let col = 0; col < maxCols; col++) {
            let maxWidth = 0;
            for (const row of rows) {
                if (col < row.length) {
                    maxWidth = Math.max(maxWidth, row[col].length);
                }
            }
            colWidths.push(maxWidth);
        }

        // Pad and align
        const align = this.alignment();
        const result = rows.map(row => {
            const paddedCols: string[] = [];
            for (let col = 0; col < maxCols; col++) {
                const val = col < row.length ? row[col] : '';
                paddedCols.push(this.padString(val, colWidths[col], align));
            }
            return paddedCols.join('  '); // two spaces between columns
        });

        return result.join('\n');
    });

    private getDelimiterRegex(): RegExp {
        switch (this.delimiter()) {
            case 'comma': return /,/;
            case 'tab': return /\t/;
            case 'pipe': return /\|/;
            case 'semicolon': return /;/;
            default: return /\s+/; // auto: whitespace
        }
    }

    private padString(str: string, width: number, align: 'left' | 'right' | 'center'): string {
        const padding = width - str.length;
        if (padding <= 0) return str;

        switch (align) {
            case 'right':
                return ' '.repeat(padding) + str;
            case 'center': {
                const left = Math.floor(padding / 2);
                const right = padding - left;
                return ' '.repeat(left) + str + ' '.repeat(right);
            }
            default:
                return str + ' '.repeat(padding);
        }
    }

    copy(): void {
        navigator.clipboard.writeText(this.output());
    }

    clear(): void {
        this.input.set('');
    }
}
