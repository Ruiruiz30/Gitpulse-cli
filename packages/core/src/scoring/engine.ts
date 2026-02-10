import { generateObject, type LanguageModel } from 'ai';
import type { CommitDiff } from '../types/git.js';
import type { CommitScore, DimensionWeight } from '../types/scoring.js';
import { commitScoringResponseSchema, batchScoringResponseSchema } from '../llm/schemas/scoring.js';
import { buildCommitPrompt, buildBatchPrompt, loadAllRubrics, type RubricName } from '../llm/prompt-builder.js';
import { computeWeightedScore } from './dimensions.js';

function getModelInfo(model: LanguageModel): { modelId: string; provider: string } {
  if (typeof model === 'string') return { modelId: model, provider: 'unknown' };
  return { modelId: model.modelId, provider: model.provider };
}

export interface ScoringEngineOptions {
  model: LanguageModel;
  weights: DimensionWeight;
  maxTokensPerDiff: number;
  repoPath?: string;
  rubricHash: string;
}

export class ScoringEngine {
  private model: LanguageModel;
  private weights: DimensionWeight;
  private maxTokensPerDiff: number;
  private rubrics: Map<RubricName, string>;
  private rubricHash: string;

  constructor(options: ScoringEngineOptions) {
    this.model = options.model;
    this.weights = options.weights;
    this.maxTokensPerDiff = options.maxTokensPerDiff;
    this.rubrics = loadAllRubrics(options.repoPath);
    this.rubricHash = options.rubricHash;
  }

  async scoreCommit(diff: CommitDiff): Promise<CommitScore> {
    const prompt = buildCommitPrompt(diff, this.rubrics, this.maxTokensPerDiff);

    const { object, usage } = await generateObject({
      model: this.model,
      schema: commitScoringResponseSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    const overallScore = computeWeightedScore(
      {
        codeQuality: object.codeQuality.score,
        complexityImpact: object.complexityImpact.score,
        commitDiscipline: object.commitDiscipline.score,
        collaboration: object.collaboration.score,
      },
      this.weights,
    );

    return {
      commitHash: diff.commit.hash,
      dimensions: {
        codeQuality: object.codeQuality,
        complexityImpact: object.complexityImpact,
        commitDiscipline: object.commitDiscipline,
        collaboration: object.collaboration,
      },
      overallScore,
      flags: [],
      reasoning: object.overallReasoning,
      metadata: {
        model: getModelInfo(this.model).modelId,
        provider: getModelInfo(this.model).provider,
        tokensUsed: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        timestamp: Date.now(),
        rubricHash: this.rubricHash,
      },
    };
  }

  async scoreBatch(diffs: CommitDiff[]): Promise<CommitScore[]> {
    const prompt = buildBatchPrompt(diffs, this.rubrics, this.maxTokensPerDiff);

    const { object, usage } = await generateObject({
      model: this.model,
      schema: batchScoringResponseSchema,
      system: prompt.system,
      prompt: prompt.user,
    });

    const tokensPerCommit = Math.floor(
      ((usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)) / diffs.length,
    );

    return object.scores.map((score) => {
      const overallScore = computeWeightedScore(
        {
          codeQuality: score.codeQuality.score,
          complexityImpact: score.complexityImpact.score,
          commitDiscipline: score.commitDiscipline.score,
          collaboration: score.collaboration.score,
        },
        this.weights,
      );

      return {
        commitHash: score.commitHash,
        dimensions: {
          codeQuality: score.codeQuality,
          complexityImpact: score.complexityImpact,
          commitDiscipline: score.commitDiscipline,
          collaboration: score.collaboration,
        },
        overallScore,
        flags: [{ type: 'batched' as const, message: 'Scored as part of a batch' }],
        reasoning: score.overallReasoning,
        metadata: {
          model: getModelInfo(this.model).modelId,
          provider: getModelInfo(this.model).provider,
          tokensUsed: tokensPerCommit,
          timestamp: Date.now(),
          rubricHash: this.rubricHash,
        },
      };
    });
  }
}
