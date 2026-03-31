import { Component, signal, inject, OnInit } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { distinctUntilChanged } from 'rxjs';

type NavItem = | { type: 'item'; key: string; label: string; icon: string; path: string; } | { type: 'divider'; };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    RouterOutlet,
    MatTabsModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {

  sidebarOpened = signal(true);
  isSmallScreen = signal(false);

  NAV_ITEMS: NavItem[] = [
    // TOOLS
    { type: 'item', key: 'time', label: 'Time Calculator', icon: 'clock', path: '/time' },
    { type: 'item', key: 'json', label: 'JSON Viewer', icon: 'code', path: '/json' },
    { type: 'item', key: 'file', label: 'File Converter', icon: 'right-left', path: '/file' },
    { type: 'item', key: 'pdftools', label: 'PDF Tools', icon: 'file', path: '/pdftools' },
    { type: 'item', key: 'imgtools', label: 'Image Tools', icon: 'palette', path: '/imgtools' },

    { type: 'divider' },

    { type: 'item', key: 'jsontots', label: 'JSON To TS', icon: 'file-code', path: '/jsontots' },
    { type: 'item', key: 'csvjson', label: 'CSV ↔ JSON', icon: 'table-columns', path: '/csvjson' },
    { type: 'item', key: 'jwt', label: 'JWT Debugger', icon: 'shield-halved', path: '/jwt' },
    { type: 'item', key: 'diff', label: 'Diff Checker', icon: 'copy', path: '/diff' },
    { type: 'item', key: 'linediff', label: 'Line Highlighter', icon: 'list-check', path: '/linediff' },
    { type: 'item', key: 'text', label: 'Text Toolbox', icon: 'pencil', path: '/text' },
    { type: 'item', key: 'dupdetect', label: 'Duplicate Detector', icon: 'clone', path: '/dupdetect' },
    { type: 'item', key: 'colalign', label: 'Column Aligner', icon: 'align-left', path: '/colalign' },
    { type: 'item', key: 'regex', label: 'RegEx Tester', icon: 'magnifying-glass', path: '/regex' },
    { type: 'item', key: 'charfreq', label: 'Char Frequency', icon: 'chart-bar', path: '/charfreq' },
    { type: 'item', key: 'base64', label: 'Base64 / URL', icon: 'lock', path: '/base64' },

    { type: 'divider' },

    { type: 'item', key: 'epoch', label: 'Epoch Converter', icon: 'calendar-days', path: '/epoch' },
    { type: 'item', key: 'filesize', label: 'File Size Formatter', icon: 'hard-drive', path: '/filesize' },
    { type: 'item', key: 'gen', label: 'Generator', icon: 'key', path: '/gen' },
    { type: 'item', key: 'qr', label: 'QR Generator', icon: 'qrcode-read', path: '/qr' },

  ];

  private breakpointObserver = inject(BreakpointObserver);

  ngOnInit() {
    this.breakpointObserver.observe('(max-width:1024px)')
      .pipe(distinctUntilChanged())
      .subscribe(result => {
        this.isSmallScreen.set(result.matches);
        this.sidebarOpened.set(!result.matches);
      });
  }

  toggleSidebar() {
    this.sidebarOpened.update(v => !v);
  }
}
