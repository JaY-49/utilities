import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

interface SizeUnit {
    label: string;
    binary: string;
    si: string;
}

@Component({
    selector: 'app-file-size-formatter',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatButtonToggleModule,
    ],
    templateUrl: './file-size-formatter.component.html'
})
export class FileSizeFormatterComponent {
    mode = signal<'bytes-to-human' | 'human-to-bytes'>('bytes-to-human');
    bytesInput = signal('');
    humanInput = signal('');
    error = signal<string | null>(null);

    // Forward conversion: bytes → all units
    sizeTable = computed<SizeUnit[]>(() => {
        const input = String(this.bytesInput() ?? '').trim();
        if (!input) return [];

        const bytes = Number(input);
        if (isNaN(bytes) || bytes < 0) return [];

        const binaryUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
        const siUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const labels = ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes', 'Petabytes'];

        return labels.map((label, i) => ({
            label,
            binary: i === 0 ? bytes.toLocaleString() + ' B' : (bytes / Math.pow(1024, i)).toFixed(4) + ' ' + binaryUnits[i],
            si: i === 0 ? bytes.toLocaleString() + ' B' : (bytes / Math.pow(1000, i)).toFixed(4) + ' ' + siUnits[i]
        }));
    });

    // Reverse conversion: human readable → bytes
    reverseResult = computed<{ bytes: number | null; error: string | null }>(() => {
        const input = String(this.humanInput() ?? '').trim();
        if (!input) return { bytes: null, error: null };

        const match = input.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB|KiB|MiB|GiB|TiB|PiB)?$/i);
        if (!match) {
            return { bytes: null, error: 'Invalid format. Use something like "1.5 GB" or "1024 KB"' };
        }

        const value = parseFloat(match[1]);
        const unit = (match[2] || 'B').toUpperCase();

        const multipliers: Record<string, number> = {
            'B': 1,
            'KB': 1000, 'MB': 1e6, 'GB': 1e9, 'TB': 1e12, 'PB': 1e15,
            'KIB': 1024, 'MIB': 1048576, 'GIB': 1073741824, 'TIB': 1099511627776, 'PIB': 1125899906842624
        };

        const mult = multipliers[unit];
        if (!mult) {
            return { bytes: null, error: `Unknown unit: ${unit}` };
        }

        return { bytes: Math.round(value * mult), error: null };
    });

    copy(text: string): void {
        navigator.clipboard.writeText(text);
    }

    clear(): void {
        this.bytesInput.set('');
        this.humanInput.set('');
        this.error.set(null);
    }
}
