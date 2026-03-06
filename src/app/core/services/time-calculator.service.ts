import { Injectable } from '@angular/core';
import { TimeDiff } from '../models/file-converter.models';

@Injectable({ providedIn: 'root' })
export class TimeCalculatorService {
    /**
     * Calculate the difference between two HH:mm time strings.
     * Assumes both are valid 24-hour times on the same day.
     */
    calculateDiff(start: string, end: string): TimeDiff {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);

        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        const totalMinutes = endMinutes - startMinutes;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return { hours, minutes, totalMinutes };
    }
}
