import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'time', pathMatch: 'full' },
  { path: 'time', loadComponent: () => import('./features/time-calculator/time-calculator.component').then(m => m.TimeCalculatorComponent) },
  { path: 'json', loadComponent: () => import('./features/json-tool/json-tool.component').then(m => m.JsonToolComponent) },
  { path: 'jsontots', loadComponent: () => import('./features/json-to-ts/json-to-ts.component').then(m => m.JsonToTsComponent) },
  { path: 'file', loadComponent: () => import('./features/file-converter/file-converter.component').then(m => m.FileConverterComponent) },
  { path: 'pdftools', loadComponent: () => import('./features/pdf-tools/pdf-tools.component').then(m => m.PdfToolsComponent) },
  { path: 'imgtools', loadComponent: () => import('./features/image-tools/image-tools.component').then(m => m.ImageToolsComponent) },
  { path: 'csvjson', loadComponent: () => import('./features/csv-json/csv-json.component').then(m => m.CsvJsonComponent) },
  { path: 'jwt', loadComponent: () => import('./features/jwt-debugger/jwt-debugger.component').then(m => m.JwtDebuggerComponent) },
  { path: 'diff', loadComponent: () => import('./features/diff-checker/diff-checker.component').then(m => m.DiffCheckerComponent) },
  { path: 'linediff', loadComponent: () => import('./features/line-highlighter/line-highlighter.component').then(m => m.LineHighlighterComponent) },
  { path: 'text', loadComponent: () => import('./features/text-toolbox/text-toolbox.component').then(m => m.TextToolboxComponent) },
  { path: 'dupdetect', loadComponent: () => import('./features/duplicate-detector/duplicate-detector.component').then(m => m.DuplicateDetectorComponent) },
  { path: 'colalign', loadComponent: () => import('./features/column-aligner/column-aligner.component').then(m => m.ColumnAlignerComponent) },
  { path: 'regex', loadComponent: () => import('./features/regex-tester/regex-tester.component').then(m => m.RegexTesterComponent) },
  { path: 'charfreq', loadComponent: () => import('./features/char-frequency/char-frequency.component').then(m => m.CharFrequencyComponent) },
  { path: 'base64', loadComponent: () => import('./features/base64-url/base64-url.component').then(m => m.Base64UrlComponent) },
  { path: 'epoch', loadComponent: () => import('./features/epoch-converter/epoch-converter.component').then(m => m.EpochConverterComponent) },
  { path: 'filesize', loadComponent: () => import('./features/file-size-formatter/file-size-formatter.component').then(m => m.FileSizeFormatterComponent) },
  { path: 'gen', loadComponent: () => import('./features/generator/generator.component').then(m => m.GeneratorComponent) },
  { path: 'qr', loadComponent: () => import('./features/qr-generator/qr-generator.component').then(m => m.QrGeneratorComponent) },
  { path: '**', redirectTo: 'time' }
];
