import { Component, signal, inject, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimeCalculatorComponent } from './features/time-calculator/time-calculator.component';
import { FileConverterComponent } from './features/file-converter/file-converter.component';
import { JsonToolComponent } from './features/json-tool/json-tool.component';
import { Base64UrlComponent } from './features/base64-url/base64-url.component';
import { EpochConverterComponent } from './features/epoch-converter/epoch-converter.component';
import { DiffCheckerComponent } from './features/diff-checker/diff-checker.component';
import { GeneratorComponent } from './features/generator/generator.component';
import { JwtDebuggerComponent } from './features/jwt-debugger/jwt-debugger.component';
import { RegexTesterComponent } from './features/regex-tester/regex-tester.component';
import { QrGeneratorComponent } from './features/qr-generator/qr-generator.component';
import { JsonToTsComponent } from './features/json-to-ts/json-to-ts.component';
import { TextToolboxComponent } from './features/text-toolbox/text-toolbox.component';
import { CsvJsonComponent } from './features/csv-json/csv-json.component';
import { DuplicateDetectorComponent } from './features/duplicate-detector/duplicate-detector.component';
import { LineHighlighterComponent } from './features/line-highlighter/line-highlighter.component';
import { CharFrequencyComponent } from './features/char-frequency/char-frequency.component';
import { ColumnAlignerComponent } from './features/column-aligner/column-aligner.component';
import { FileSizeFormatterComponent } from './features/file-size-formatter/file-size-formatter.component';
import { distinctUntilChanged } from 'rxjs';

/**
 * Root component – renders a Material sidenav layout housing utility features.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatTooltipModule,
    TimeCalculatorComponent,
    FileConverterComponent,
    JsonToolComponent,
    Base64UrlComponent,
    EpochConverterComponent,
    DiffCheckerComponent,
    GeneratorComponent,
    JwtDebuggerComponent,
    RegexTesterComponent,
    QrGeneratorComponent,
    JsonToTsComponent,
    TextToolboxComponent,
    CsvJsonComponent,
    DuplicateDetectorComponent,
    LineHighlighterComponent,
    CharFrequencyComponent,
    ColumnAlignerComponent,
    FileSizeFormatterComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  selectedTab = signal('time');
  sidebarOpened = signal(true);
  isSmallScreen = signal(false);

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
