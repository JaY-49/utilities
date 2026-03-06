import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

interface CharEntry {
    char: string;
    display: string;
    count: number;
    percentage: number;
}

@Component({
    selector: 'app-char-frequency',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatCheckboxModule,
    ],
    templateUrl: './char-frequency.component.html'
})
export class CharFrequencyComponent {
    input = signal('');
    includeWhitespace = signal(false);
    caseSensitive = signal(false);

    result = computed<CharEntry[]>(() => {
        let text = this.input();
        if (!text) return [];

        if (!this.caseSensitive()) {
            text = text.toLowerCase();
        }

        const counts = new Map<string, number>();
        for (const char of text) {
            if (!this.includeWhitespace() && /\s/.test(char)) continue;
            counts.set(char, (counts.get(char) || 0) + 1);
        }

        const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

        return Array.from(counts.entries())
            .map(([char, count]) => ({
                char,
                display: this.getDisplayName(char),
                count,
                percentage: total > 0 ? (count / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);
    });

    totalChars = computed(() => this.result().reduce((sum, e) => sum + e.count, 0));
    uniqueChars = computed(() => this.result().length);

    private getDisplayName(char: string): string {
        if (char === ' ') return '⎵ space';
        if (char === '\t') return '⇥ tab';
        if (char === '\n') return '↵ newline';
        if (char === '\r') return '⏎ return';
        return char;
    }

    copy(): void {
        const text = this.result()
            .map(e => `${e.display}\t${e.count}\t${e.percentage.toFixed(1)}%`)
            .join('\n');
        navigator.clipboard.writeText(text);
    }

    clear(): void {
        this.input.set('');
    }
}
