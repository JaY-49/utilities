import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-json-to-ts',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule,
    ],
    templateUrl: './json-to-ts.component.html'
})
export class JsonToTsComponent {
    jsonInput = signal('');
    tsOutput = signal('');
    rootInterfaceName = signal('RootInterface');
    error = signal<string | null>(null);

    generate() {
        try {
            this.error.set(null);
            const parsed = this.parseJsonLikeInput(this.jsonInput());
            const interfaces: string[] = [];
            this.convertObjectToInterface(parsed, this.rootInterfaceName().trim() || 'RootInterface', interfaces);
            this.tsOutput.set(interfaces.reverse().join('\n\n'));
        } catch (e: any) {
            this.error.set('Invalid JSON: ' + e.message);
            this.tsOutput.set('');
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

    private convertObjectToInterface(obj: any, name: string, interfaces: string[]) {
        if (obj === null || typeof obj !== 'object') return 'any';

        let result = `export interface ${name} {\n`;

        for (const key in obj) {
            const val = obj[key];
            const type = this.getType(val, key, interfaces);
            result += `  ${key}: ${type};\n`;
        }

        result += `}`;
        interfaces.push(result);
        return name;
    }

    private getType(val: any, key: string, interfaces: string[]): string {
        if (val === null) return 'any';
        if (Array.isArray(val)) {
            if (val.length === 0) return 'any[]';
            const firstType = this.getType(val[0], this.toPascalCase(key) + 'Item', interfaces);
            return `${firstType}[]`;
        }
        if (typeof val === 'object') {
            const childName = this.toPascalCase(key);
            return this.convertObjectToInterface(val, childName, interfaces);
        }
        return typeof val;
    }

    private toPascalCase(str: string) {
        return str.replace(/(\w)(\w*)/g, (g, p1, p2) => p1.toUpperCase() + p2.toLowerCase()).replace(/\s/g, '');
    }

    copyOutput() {
        navigator.clipboard.writeText(this.tsOutput());
    }

    clear() {
        this.jsonInput.set('');
        this.tsOutput.set('');
        this.error.set(null);
    }
}
