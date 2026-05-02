import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Assessment } from '@/core/assessment/entity/assessment.entity';
import { Student } from '@/core/user/entity/student.entity';
import { GeminiService } from '@/core/assessment/services/gemini.service';
import {
  ASSESSMENT_OUTPUT_DEST,
  toFeedbackAudioPath,
  toInputAudioPath,
} from '@/core/assessment/storage/assessment.storage';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(Assessment) private readonly assessmentRepo: Repository<Assessment>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly geminiService: GeminiService,
  ) {}

  async assess(studentUserId: string, file: Express.Multer.File) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) throw new NotFoundException('Talaba topilmadi');

    const audio = await fs.readFile(file.path);
    const feedbackText = await this.geminiService.analyzeAudio(audio, file.mimetype);
    const feedbackWav = await this.geminiService.synthesizeSpeech(feedbackText);

    const feedbackFilename = `${randomUUID()}.wav`;
    await fs.writeFile(join(ASSESSMENT_OUTPUT_DEST, feedbackFilename), feedbackWav);

    return this.assessmentRepo.save({
      student,
      inputAudio: toInputAudioPath(file.filename),
      feedbackText,
      feedbackAudio: toFeedbackAudioPath(feedbackFilename),
    });
  }

  async findMine(studentUserId: string) {
    const student = await this.studentRepo.findOne({ where: { user: { id: studentUserId } } });
    if (!student) return [];

    return this.assessmentRepo.find({
      where: { student: { id: student.id } },
      order: { createdAt: 'DESC' },
    });
  }
}
