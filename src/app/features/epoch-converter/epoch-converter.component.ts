import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-epoch-converter',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule,
    ],
    templateUrl: './epoch-converter.component.html',
})
export class EpochConverterComponent implements OnDestroy {
    epochInput = signal('');
    dateInput = signal('');
    epochResult = signal('');
    dateResult = signal('');
    currentEpoch = signal(Math.floor(Date.now() / 1000));
    currentDate = signal(new Date().toISOString());
    error = signal<string | null>(null);

    private timer = setInterval(() => {
        this.currentEpoch.set(Math.floor(Date.now() / 1000));
        this.currentDate.set(new Date().toISOString());
    }, 1000);

    ngOnDestroy() {
        clearInterval(this.timer);
    }

    epochToDate(): void {
        try {
            this.error.set(null);
            const val = Number(this.epochInput());
            if (isNaN(val)) throw new Error('Enter a valid number');
            // Support seconds and milliseconds
            const ms = val > 1e12 ? val : val * 1000;
            const d = new Date(ms);
            if (isNaN(d.getTime())) throw new Error('Invalid timestamp');
            this.dateResult.set(d.toLocaleString() + ' (' + d.toISOString() + ')');
        } catch (e: any) {
            this.error.set(e.message);
            this.dateResult.set('');
        }
    }

    dateToEpoch(): void {
        try {
            this.error.set(null);
            const d = new Date(this.dateInput());
            if (isNaN(d.getTime())) throw new Error('Invalid date format');
            this.epochResult.set(
                'Seconds: ' + Math.floor(d.getTime() / 1000) +
                '  |  Milliseconds: ' + d.getTime()
            );
        } catch (e: any) {
            this.error.set(e.message);
            this.epochResult.set('');
        }
    }

    useNow(): void {
        this.epochInput.set(String(Math.floor(Date.now() / 1000)));
        this.epochToDate();
    }

    copy(text: string): void {
        navigator.clipboard.writeText(text);
    }
}
