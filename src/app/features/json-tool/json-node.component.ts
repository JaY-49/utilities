import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-json-node',
  standalone: true,
  imports: [CommonModule, MatIconModule, JsonNodeComponent],
  template: `
    


<div class="py-2 pl-6 relative rounded-xl transition-colors hover:bg-slate-50">
    @if (isExpandable && expanded()) {
    <div class="absolute left-2 top-8 bottom-2 w-px bg-slate-200"></div>
    }

    <div class="flex items-center gap-3">
        @if (isExpandable) {
        <button (click)="toggle()"
            class="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            <mat-icon class="text-md transition-transform text-slate-500" [class.rotate-90]="expanded()"
                svgIcon="heroicons_mini:chevron-right">
            </mat-icon>
        </button>
        } @else {
        <div class="w-7 flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
        </div>
        }

        <div class="flex items-baseline gap-2 flex-wrap">
            <span class="font-mono text-md text-slate-800">{{ key }}</span>

            <span class="text-slate-300 font-mono">:</span>

            @if (!isExpandable) {
            <span class="font-mono text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                {{ formatValue(value) }}
            </span>
            } @else {
            <span class="text-sm font-mono uppercase tracking-[0.2em] text-slate-400">
                {{ getSummary() }}
            </span>
            }
        </div>
    </div>

    @if (isExpandable && expanded()) {
    <div class="mt-2 ml-1 animate-[fadeUp_0.2s_ease]">
        @for (item of getEntries(); track item.key) {
        <app-json-node [key]="item.key" [value]="item.value"></app-json-node>
        }
    </div>
    }
  </div>  
  `,
  styles: [
    `
      .json-node {
        font-family: 'JetBrains Mono', 'Fira Code', 'Menlo', monospace;
      }
      .text-bool {
        color: #92400e;
      }
      .text-num {
        color: #1e40af;
      }
      .text-str {
        color: #065f46;
      }
      .text-null {
        color: #475569;
        font-style: italic;
      }
    `,
  ],
})
export class JsonNodeComponent implements OnInit {
  @Input({ required: true }) key!: string | number;
  @Input({ required: true }) value: any;

  expanded = signal(false);
  isExpandable = false;

  ngOnInit() {
    this.isExpandable = this.value !== null && typeof this.value === 'object';
  }

  toggle() {
    this.expanded.update((v) => !v);
  }

  getEntries() {
    if (!this.isExpandable) return [];
    return Object.entries(this.value).map(([k, v]) => ({ key: k, value: v }));
  }

  getSummary() {
    if (Array.isArray(this.value)) return `[ ${this.value.length} items ]`;
    return `{ ${Object.keys(this.value).length} keys }`;
  }

  formatValue(val: any) {
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    return val;
  }

  getValueBg() {
    if (this.value === null) return 'rgba(241, 245, 249, 0.5)';
    if (typeof this.value === 'boolean') return 'rgba(254, 243, 199, 0.5)';
    if (typeof this.value === 'number') return 'rgba(219, 234, 254, 0.5)';
    return 'rgba(209, 250, 229, 0.5)';
  }

  getValueClass() {
    if (this.value === null) return 'text-null';
    if (typeof this.value === 'boolean') return 'text-bool';
    if (typeof this.value === 'number') return 'text-num';
    return 'text-str';
  }
}
