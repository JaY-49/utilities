import { Component, signal, effect, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-qr-generator',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatSliderModule
    ],
    templateUrl: './qr-generator.component.html'
})
export class QrGeneratorComponent implements AfterViewInit {
    @ViewChild('qrCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    text = signal('');
    size = signal(256);
    darkColor = signal('#000000');
    lightColor = signal('#ffffff');
    margin = signal(4);
    error = signal<string | null>(null);
    private ready = false;

    ngAfterViewInit() {
        this.ready = true;
        this.generateQr();
    }

    constructor() {
        effect(() => {
            // Read all signals to track them
            this.text();
            this.size();
            this.darkColor();
            this.lightColor();
            this.margin();
            if (this.ready) {
                this.generateQr();
            }
        });
    }

    async generateQr() {
        if (!this.text() || !this.canvasRef?.nativeElement) return;

        try {
            this.error.set(null);
            await QRCode.toCanvas(this.canvasRef.nativeElement, this.text(), {
                width: this.size(),
                margin: this.margin(),
                color: {
                    dark: this.darkColor(),
                    light: this.lightColor()
                }
            });
        } catch (err: any) {
            this.error.set(err.message);
        }
    }

    download() {
        const canvas = this.canvasRef?.nativeElement;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    clear() {
        this.text.set('');
        this.error.set(null);
    }
}
