/* eslint-disable @typescript-eslint/no-unsafe-call -- class-validator decorators */
import { IsIn, IsObject, IsOptional } from 'class-validator';
import {
  DEFAULT_INSIGHT_PERIOD,
  INSIGHT_PERIODS,
} from '../constants/insight-period';
import { INSIGHT_KINDS } from '../constants/insights-prompts';

export class GenerateInsightsDto {
  @IsIn([...INSIGHT_KINDS])
  kind!: (typeof INSIGHT_KINDS)[number];

  @IsOptional()
  @IsIn([...INSIGHT_PERIODS])
  period?: (typeof INSIGHT_PERIODS)[number] = DEFAULT_INSIGHT_PERIOD;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
