import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-duplicate-detector',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule,
    ],
    templateUrl: './duplicate-detector.component.html'
})
export class DuplicateDetectorComponent {
    input = signal('');

    result = computed(() => {
        const text = this.input().trim();
        if (!text) return { duplicates: [] as { value: string; count: number }[], totalLines: 0, uniqueLines: 0, duplicateLines: 0 };

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const counts = new Map<string, number>();

        for (const line of lines) {
            counts.set(line, (counts.get(line) || 0) + 1);
        }

        const duplicates = Array.from(counts.entries())
            .filter(([, count]) => count > 1)
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);

        const uniqueLines = Array.from(counts.values()).filter(c => c === 1).length;
        const duplicateLines = lines.length - uniqueLines;

        return { duplicates, totalLines: lines.length, uniqueLines, duplicateLines };
    });

    copyResults(): void {
        const dupes = this.result().duplicates;
        const text = dupes.map(d => `${d.value} (${d.count})`).join('\n');
        navigator.clipboard.writeText(text);
    }

    clear(): void {
        this.input.set('');
    }
}
