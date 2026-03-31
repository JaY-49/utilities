import { afterNextRender, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    Validators,
    ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';

import { TimeCalculatorService } from '../../core/services/time-calculator.service';
import { TimeDiff } from '../../core/models/file-converter.models';

type TimeField = 'startH' | 'startM' | 'endH' | 'endM';

@Component({
    selector: 'app-time-calculator',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatCardModule,
    ],
    templateUrl: './time-calculator.component.html'
})
export class TimeCalculatorComponent {
    private readonly fb = inject(FormBuilder);
    private readonly timeSvc = inject(TimeCalculatorService);
    readonly startHInput = viewChild.required<ElementRef<HTMLInputElement>>('startHInput');
    readonly startMInput = viewChild.required<ElementRef<HTMLInputElement>>('startMInput');
    readonly endHInput = viewChild.required<ElementRef<HTMLInputElement>>('endHInput');
    readonly endMInput = viewChild.required<ElementRef<HTMLInputElement>>('endMInput');

    /** Reactive form with separate hour/minute inputs and cross-field validation */
    form: FormGroup = this.fb.group(
        {
            startH: ['09', [Validators.required, Validators.min(0), Validators.max(23)]],
            startM: ['00', [Validators.required, Validators.min(0), Validators.max(59)]],
            endH: ['18', [Validators.required, Validators.min(0), Validators.max(23)]],
            endM: ['30', [Validators.required, Validators.min(0), Validators.max(59)]],
        },
        { validators: this.numericTimeOrderValidator() }
    );

    /** Computed result; null until a successful calculation */
    result = signal<TimeDiff | null>(null);

    constructor() {
        afterNextRender(() => {
            this.focusField('startH');
            this.recalculateResult();
        });
    }

    // Helpers for template access
    get startH() { return this.form.get('startH')!; }
    get startM() { return this.form.get('startM')!; }
    get endH() { return this.form.get('endH')!; }
    get endM() { return this.form.get('endM')!; }

    /** Custom validator for numeric hour/minute pairs */
    private numericTimeOrderValidator() {
        return (group: FormGroup) => {
            const sh = group.get('startH')?.value;
            const sm = group.get('startM')?.value;
            const eh = group.get('endH')?.value;
            const em = group.get('endM')?.value;

            if (sh === null || sm === null || eh === null || em === null ||
                sh === '' || sm === '' || eh === '' || em === '') return null;

            const startTotal = Number(sh) * 60 + Number(sm);
            const endTotal = Number(eh) * 60 + Number(em);

            return endTotal < startTotal ? { endBeforeStart: true } : null;
        };
    }

    handleTimeInput(controlName: TimeField, event: Event, nextField?: TimeField): void {
        const input = event.target as HTMLInputElement;
        const digits = input.value.replace(/\D/g, '').slice(0, 2);
        const control = this.form.get(controlName);

        if (input.value !== digits) {
            input.value = digits;
        }

        if (control && control.value !== digits) {
            control.setValue(digits, { emitEvent: false });
        }

        this.recalculateResult();

        if (digits.length === 2 && nextField) {
            queueMicrotask(() => this.focusField(nextField));
        }
    }

    private recalculateResult(): void {
        if (this.form.invalid) {
            this.result.set(null);
            return;
        }

        const startStr = `${String(this.form.value.startH).padStart(2, '0')}:${String(this.form.value.startM).padStart(2, '0')}`;
        const endStr = `${String(this.form.value.endH).padStart(2, '0')}:${String(this.form.value.endM).padStart(2, '0')}`;

        const diff = this.timeSvc.calculateDiff(startStr, endStr);
        this.result.set(diff);
    }

    private focusField(field: TimeField): void {
        this.focusAndSelect(this.getInput(field));
    }

    private getInput(field: TimeField): HTMLInputElement {
        switch (field) {
            case 'startH':
                return this.startHInput().nativeElement;
            case 'startM':
                return this.startMInput().nativeElement;
            case 'endH':
                return this.endHInput().nativeElement;
            case 'endM':
                return this.endMInput().nativeElement;
        }
    }

    private focusAndSelect(input: HTMLInputElement): void {
        input.focus();
        input.select();
    }
}
