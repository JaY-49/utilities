import { AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';

/** Strict 24-hour HH:mm regex (00:00 – 23:59) */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates that the control value is a valid 24-hour time string (HH:mm).
 * Returns `{ invalidTimeFormat: true }` if invalid.
 */
export function timeFormatValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value: string = control.value ?? '';
        if (!value) return null; // defer to required validator
        return TIME_REGEX.test(value) ? null : { invalidTimeFormat: true };
    };
}

/**
 * Cross-field group validator: ensures `endTime` is strictly >= `startTime`.
 * Returns `{ endBeforeStart: true }` on the group if the order is wrong.
 *
 * Must be applied to the FormGroup itself, not individual controls.
 */
export function timeOrderValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const start: string = group.get('startTime')?.value ?? '';
        const end: string = group.get('endTime')?.value ?? '';

        // Only validate when both fields have values and format is valid
        if (!start || !end) return null;
        if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) return null;

        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);

        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        return endMinutes < startMinutes ? { endBeforeStart: true } : null;
    };
}
