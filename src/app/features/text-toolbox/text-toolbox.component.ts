import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-text-toolbox',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatTooltipModule
    ],
    templateUrl: './text-toolbox.component.html'
})
export class TextToolboxComponent {
    text = signal('');

    stats = computed(() => {
        const val = this.text();
        return {
            chars: val.length,
            lines: val ? val.split('\n').length : 0,
            words: val ? val.trim().split(/\s+/).length : 0
        };
    });

    // Case Conversions
    toCamel() {
        this.text.update(t => t.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', '')));
    }

    toSnake() {
        this.text.update(t => t.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '').replace(/-/g, '_'));
    }

    toUpperCase() {
        this.text.update(t => t.toUpperCase());
    }

    toLowerCase() {
        this.text.update(t => t.toLowerCase());
    }

    toKebab() {
        this.text.update(t => t.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '').replace(/_/g, '-'));
    }

    // Line Operations
    removeDuplicates() {
        this.text.update(t => Array.from(new Set(t.split('\n'))).join('\n'));
    }

    trimLines() {
        this.text.update(t => t.split('\n').map(line => line.trim()).join('\n'));
    }

    sortLines() {
        this.text.update(t => t.split('\n').sort().join('\n'));
    }

    // JSON operations
    escapeJson() {
        try {
            this.text.set(JSON.stringify(this.text()));
        } catch (e) {
            // If already a string or failing, we just stringify it
            this.text.set(JSON.stringify(this.text()));
        }
    }

    unescapeJson() {
        try {
            // Try to parse it if it looks like a JSON string
            const val = this.text();
            if (val.startsWith('"') && val.endsWith('"')) {
                this.text.set(JSON.parse(val));
            } else {
                // Fallback: try direct parse
                this.text.set(JSON.parse(`"${val}"`));
            }
        } catch {
            // do nothing
        }
    }

    copy() {
        navigator.clipboard.writeText(this.text());
    }

    clear() {
        this.text.set('');
    }
}
