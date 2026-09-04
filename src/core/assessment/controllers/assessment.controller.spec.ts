import { ConfigService } from '@nestjs/config';

import { AssessmentController } from '@/core/assessment/controllers/assessment.controller';

describe('AssessmentController.getAssemblyAiKey', () => {
  const assessmentService = {};
  const configService = { getOrThrow: jest.fn() };
  const controller = new AssessmentController(assessmentService as never, configService as unknown as ConfigService);

  beforeEach(() => jest.clearAllMocks());

  it('returns the configured AssemblyAI API key', () => {
    configService.getOrThrow.mockReturnValue('assembly-key');

    expect(controller.getAssemblyAiKey()).toEqual({ apiKey: 'assembly-key' });
    expect(configService.getOrThrow).toHaveBeenCalledWith('ASSEMBLYAI_API_KEY');
  });

  it('fails when the AssemblyAI API key is not configured', () => {
    configService.getOrThrow.mockImplementation(() => {
      throw new TypeError('Configuration key "ASSEMBLYAI_API_KEY" does not exist');
    });

    expect(() => controller.getAssemblyAiKey()).toThrow('ASSEMBLYAI_API_KEY');
  });
});
