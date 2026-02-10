import type { AnalysisReport, ReportFormat } from '../types/report.js';
import { formatJson } from './formats/json.js';
import { formatMarkdown } from './formats/markdown.js';
import { formatHtml } from './formats/html.js';

export function generateReport(report: AnalysisReport, format: ReportFormat): string {
  switch (format) {
    case 'json':
      return formatJson(report);
    case 'markdown':
    case 'terminal':
      return formatMarkdown(report);
    case 'html':
      return formatHtml(report);
    default:
      throw new Error(`Unknown report format: ${format}`);
  }
}
