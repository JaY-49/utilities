import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

interface RegexMatch {
    index: number;
    match: string;
    groups: string[];
}

@Component({
    selector: 'app-regex-tester',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatCheckboxModule,
    ],
    templateUrl: './regex-tester.component.html',
})
export class RegexTesterComponent {
    pattern = signal('');
    testString = signal('');
    flagGlobal = signal(true);
    flagCaseInsensitive = signal(false);
    flagMultiline = signal(false);
    regexResult = computed(() => {
        const p = this.pattern();
        const s = this.testString();

        if (!p) return { matches: [], error: null, highlighted: s };

        try {
            let flags = '';
            if (this.flagGlobal()) flags += 'g';
            if (this.flagCaseInsensitive()) flags += 'i';
            if (this.flagMultiline()) flags += 'm';

            const regex = new RegExp(p, flags);
            const results: RegexMatch[] = [];

            if (s) {
                // Must clone for exec if we use g
                const matchRegex = new RegExp(p, flags);
                let match: RegExpExecArray | null;

                if (flags.includes('g')) {
                    while ((match = matchRegex.exec(s)) !== null) {
                        results.push({
                            index: match.index,
                            match: match[0],
                            groups: match.slice(1)
                        });
                        if (!match[0]) matchRegex.lastIndex++;
                    }
                } else {
                    match = matchRegex.exec(s);
                    if (match) {
                        results.push({
                            index: match.index,
                            match: match[0],
                            groups: match.slice(1)
                        });
                    }
                }
            }

            const highlighted = s ? s.replace(regex, (m) =>
                `<mark class="bg-yellow-200 text-yellow-900 px-0.5 rounded font-bold">${this.escapeHtml(m)}</mark>`
            ) : s;

            return { matches: results, error: null, highlighted };
        } catch (e: any) {
            return { matches: [], error: 'Invalid pattern: ' + e.message, highlighted: s };
        }
    });

    matches = computed(() => this.regexResult().matches);
    error = computed(() => this.regexResult().error);
    highlightedText = computed(() => this.regexResult().highlighted);
    matchCount = computed(() => this.matches().length);

    private escapeHtml(str: string): string {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
