import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
    selector: 'app-base64-url',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatButtonToggleModule,
    ],
    templateUrl: './base64-url.component.html',
})
export class Base64UrlComponent {

    b64Input = signal('');
    b64Output = signal('');

    urlInput = signal('');
    urlOutput = signal('');

    error = signal<string | null>(null);

    b64Encode(): void {
        try {
            this.error.set(null);
            this.b64Output.set(
                btoa(unescape(encodeURIComponent(this.b64Input())))
            );
        } catch (e: any) {
            this.error.set('Base64 encode failed: ' + e.message);
        }
    }

    b64Decode(): void {
        try {
            this.error.set(null);
            this.b64Output.set(
                decodeURIComponent(escape(atob(this.b64Input())))
            );
        } catch (e: any) {
            this.error.set('Base64 decode failed: ' + e.message);
        }
    }

    urlEncode(): void {
        try {
            this.error.set(null);
            this.urlOutput.set(
                encodeURIComponent(this.urlInput())
            );
        } catch (e: any) {
            this.error.set('URL encode failed: ' + e.message);
        }
    }

    urlDecode(): void {
        try {
            this.error.set(null);
            this.urlOutput.set(
                decodeURIComponent(this.urlInput())
            );
        } catch (e: any) {
            this.error.set('URL decode failed: ' + e.message);
        }
    }

    copy(text: string): void {
        navigator.clipboard.writeText(text);
    }
}