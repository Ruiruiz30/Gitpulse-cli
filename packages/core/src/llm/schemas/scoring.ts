import { z } from 'zod';

export const subScoreSchema = z.object({
  name: z.string().describe('Name of the sub-dimension'),
  score: z.number().min(0).max(100).describe('Score from 0-100'),
  weight: z.number().min(0).max(1).describe('Weight of this sub-dimension'),
});

export const dimensionScoreSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall dimension score from 0-100'),
  subScores: z.array(subScoreSchema).describe('Individual sub-dimension scores'),
  reasoning: z.string().describe('Brief explanation for this dimension score'),
});

export const commitScoringResponseSchema = z.object({
  codeQuality: dimensionScoreSchema.describe('Code quality assessment'),
  complexityImpact: dimensionScoreSchema.describe('Complexity and impact assessment'),
  commitDiscipline: dimensionScoreSchema.describe('Commit discipline assessment'),
  collaboration: dimensionScoreSchema.describe('Collaboration signals assessment'),
  overallReasoning: z.string().describe('Overall summary of the commit quality'),
});

export const batchScoringResponseSchema = z.object({
  scores: z
    .array(
      z.object({
        commitHash: z.string().describe('The commit hash being scored'),
        codeQuality: dimensionScoreSchema,
        complexityImpact: dimensionScoreSchema,
        commitDiscipline: dimensionScoreSchema,
        collaboration: dimensionScoreSchema,
        overallReasoning: z.string(),
      }),
    )
    .describe('Scores for each commit in the batch'),
});

export type CommitScoringResponse = z.infer<typeof commitScoringResponseSchema>;
export type BatchScoringResponse = z.infer<typeof batchScoringResponseSchema>;
