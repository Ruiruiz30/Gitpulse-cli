import type { AnalysisReport } from '../../types/report.js';

export function formatJson(report: AnalysisReport): string {
  return JSON.stringify(report, null, 2);
}
