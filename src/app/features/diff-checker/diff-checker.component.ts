import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface DiffLine {
    type: 'same' | 'added' | 'removed';
    lineNum: number;
    text: string;
}

@Component({
    selector: 'app-diff-checker',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule,
    ],
    templateUrl: './diff-checker.component.html',
})
export class DiffCheckerComponent {
    original = signal('');
    modified = signal('');
    diffLines = signal<DiffLine[]>([]);
    stats = signal<{ added: number; removed: number; same: number } | null>(null);

    compare(): void {
        const origLines = this.original().split('\n');
        const modLines = this.modified().split('\n');
        const result: DiffLine[] = [];
        const maxLen = Math.max(origLines.length, modLines.length);
        let added = 0, removed = 0, same = 0;

        // Simple line-by-line comparison
        for (let i = 0; i < maxLen; i++) {
            const origLine = i < origLines.length ? origLines[i] : undefined;
            const modLine = i < modLines.length ? modLines[i] : undefined;

            if (origLine === modLine) {
                result.push({ type: 'same', lineNum: i + 1, text: origLine! });
                same++;
            } else {
                if (origLine !== undefined) {
                    result.push({ type: 'removed', lineNum: i + 1, text: origLine });
                    removed++;
                }
                if (modLine !== undefined) {
                    result.push({ type: 'added', lineNum: i + 1, text: modLine });
                    added++;
                }
            }
        }

        this.diffLines.set(result);
        this.stats.set({ added, removed, same });
    }

    clear(): void {
        this.original.set('');
        this.modified.set('');
        this.diffLines.set([]);
        this.stats.set(null);
    }

    swapTexts(): void {
        const orig = this.original();
        this.original.set(this.modified());
        this.modified.set(orig);
    }
}
