import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
    selector: 'app-generator',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatSliderModule, MatCheckboxModule,
    ],
    templateUrl: './generator.component.html',
})
export class GeneratorComponent {
    // UUID
    uuids = signal<string[]>([]);
    uuidCount = signal(1);

    // Password
    passwords = signal<string[]>([]);
    pwLength = signal(16);
    pwCount = signal(1);
    includeUpper = signal(true);
    includeLower = signal(true);
    includeNumbers = signal(true);
    includeSymbols = signal(true);

    generateUuids(): void {
        const list: string[] = [];
        for (let i = 0; i < this.uuidCount(); i++) {
            list.push(crypto.randomUUID());
        }
        this.uuids.set(list);
    }

    generatePasswords(): void {
        let chars = '';
        if (this.includeLower()) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (this.includeUpper()) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (this.includeNumbers()) chars += '0123456789';
        if (this.includeSymbols()) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

        const list: string[] = [];
        const arr = new Uint32Array(this.pwLength());
        for (let i = 0; i < this.pwCount(); i++) {
            crypto.getRandomValues(arr);
            let pw = '';
            for (let j = 0; j < this.pwLength(); j++) {
                pw += chars[arr[j] % chars.length];
            }
            list.push(pw);
        }
        this.passwords.set(list);
    }

    copy(text: string): void {
        navigator.clipboard.writeText(text);
    }

    copyAll(items: string[]): void {
        navigator.clipboard.writeText(items.join('\n'));
    }
}
