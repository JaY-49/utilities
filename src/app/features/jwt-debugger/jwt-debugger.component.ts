import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-jwt-debugger',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule,
    ],
    templateUrl: './jwt-debugger.component.html',
})
export class JwtDebuggerComponent {
    token = signal('');
    header = signal<any>(null);
    payload = signal<any>(null);
    signature = signal('');
    error = signal<string | null>(null);
    isExpired = signal(false);
    expiresAt = signal('');

    decode(): void {
        try {
            this.error.set(null);
            const parts = this.token().trim().split('.');
            if (parts.length !== 3) throw new Error('JWT must have 3 parts separated by dots (header.payload.signature)');

            const header = JSON.parse(this.b64urlDecode(parts[0]));
            const payload = JSON.parse(this.b64urlDecode(parts[1]));

            this.header.set(header);
            this.payload.set(payload);
            this.signature.set(parts[2]);

            // Check expiration
            if (payload.exp) {
                const expDate = new Date(payload.exp * 1000);
                this.isExpired.set(expDate < new Date());
                this.expiresAt.set(expDate.toLocaleString() + ' (' + expDate.toISOString() + ')');
            } else {
                this.isExpired.set(false);
                this.expiresAt.set('');
            }
        } catch (e: any) {
            this.error.set(e.message);
            this.header.set(null);
            this.payload.set(null);
            this.signature.set('');
        }
    }

    clear(): void {
        this.token.set('');
        this.header.set(null);
        this.payload.set(null);
        this.signature.set('');
        this.error.set(null);
        this.isExpired.set(false);
        this.expiresAt.set('');
    }

    formatJson(obj: any): string {
        return JSON.stringify(obj, null, 4);
    }

    private b64urlDecode(str: string): string {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        return decodeURIComponent(escape(atob(base64)));
    }
}
