import { Component, inject, signal } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    Validators,
    ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';

import { TimeCalculatorService } from '../../core/services/time-calculator.service';
import { TimeDiff } from '../../core/models/file-converter.models';

@Component({
    selector: 'app-time-calculator',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
    ],
    templateUrl: './time-calculator.component.html'
})
export class TimeCalculatorComponent {
    private readonly fb = inject(FormBuilder);
    private readonly timeSvc = inject(TimeCalculatorService);

    /** Reactive form with separate hour/minute inputs and cross-field validation */
    form: FormGroup = this.fb.group(
        {
            startH: ['9', [Validators.required, Validators.min(0), Validators.max(23)]],
            startM: ['00', [Validators.required, Validators.min(0), Validators.max(59)]],
            endH: ['18', [Validators.required, Validators.min(0), Validators.max(23)]],
            endM: ['30', [Validators.required, Validators.min(0), Validators.max(59)]],
        },
        { validators: this.numericTimeOrderValidator() }
    );

    /** Computed result; null until a successful calculation */
    result = signal<TimeDiff | null>(null);
    submitted = signal(false);

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

    calculate(): void {
        this.submitted.set(true);
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            this.result.set(null);
            return;
        }

        const startStr = `${String(this.form.value.startH).padStart(2, '0')}:${String(this.form.value.startM).padStart(2, '0')}`;
        const endStr = `${String(this.form.value.endH).padStart(2, '0')}:${String(this.form.value.endM).padStart(2, '0')}`;

        const diff = this.timeSvc.calculateDiff(startStr, endStr);
        this.result.set(diff);
    }

    reset(): void {
        this.form.reset({
            startH: '9',
            startM: '00',
            endH: '18',
            endM: '20'
        });
        this.submitted.set(false);
        this.result.set(null);
    }
}
