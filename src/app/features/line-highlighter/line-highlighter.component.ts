import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface HighlightLine {
    text: string;
    type: 'missing' | 'added' | 'duplicated' | 'moved';
}

@Component({
    selector: 'app-line-highlighter',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule,
    ],
    templateUrl: './line-highlighter.component.html'
})
export class LineHighlighterComponent {
    listA = signal('');
    listB = signal('');
    results = signal<{
        missing: HighlightLine[];
        added: HighlightLine[];
        duplicated: HighlightLine[];
        moved: HighlightLine[];
    } | null>(null);

    stats = computed(() => {
        const r = this.results();
        if (!r) return null;
        return {
            missing: r.missing.length,
            added: r.added.length,
            duplicated: r.duplicated.length,
            moved: r.moved.length
        };
    });

    analyze(): void {
        const aLines = this.listA().split('\n').map(l => l.trim()).filter(l => l.length);
        const bLines = this.listB().split('\n').map(l => l.trim()).filter(l => l.length);

        const aSet = new Set(aLines);
        const bSet = new Set(bLines);

        // Missing: in A but not in B
        const missing = aLines.filter(l => !bSet.has(l))
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(text => ({ text, type: 'missing' as const }));

        // Added: in B but not in A
        const added = bLines.filter(l => !aSet.has(l))
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(text => ({ text, type: 'added' as const }));

        // Duplicated: lines appearing more than once within either list
        const aCounts = new Map<string, number>();
        const bCounts = new Map<string, number>();
        aLines.forEach(l => aCounts.set(l, (aCounts.get(l) || 0) + 1));
        bLines.forEach(l => bCounts.set(l, (bCounts.get(l) || 0) + 1));

        const dupSet = new Set<string>();
        aCounts.forEach((count, line) => { if (count > 1) dupSet.add(line); });
        bCounts.forEach((count, line) => { if (count > 1) dupSet.add(line); });

        const duplicated = Array.from(dupSet).map(text => ({ text, type: 'duplicated' as const }));

        // Moved: present in both but at different indices
        const moved: HighlightLine[] = [];
        const commonLines = aLines.filter(l => bSet.has(l))
            .filter((v, i, a) => a.indexOf(v) === i);

        for (const line of commonLines) {
            const aIdx = aLines.indexOf(line);
            const bIdx = bLines.indexOf(line);
            if (aIdx !== bIdx) {
                moved.push({ text: `${line}  (A:${aIdx + 1} → B:${bIdx + 1})`, type: 'moved' });
            }
        }

        this.results.set({ missing, added, duplicated, moved });
    }

    clear(): void {
        this.listA.set('');
        this.listB.set('');
        this.results.set(null);
    }

    swap(): void {
        const a = this.listA();
        this.listA.set(this.listB());
        this.listB.set(a);
    }
}
