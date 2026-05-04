import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Modality } from '@google/genai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const ASSESSMENT_PROMPT = [
  'You are a friendly language coach. The user has submitted a short spoken audio clip.',
  'Listen carefully and produce concise spoken feedback (3-5 sentences).',
  'Cover: pronunciation, fluency, grammar, and one concrete suggestion to improve.',
  'Speak directly to the learner in encouraging, plain English.',
  'Do not include markdown, headings, or bullet points — just the spoken text.',
].join(' ');

@Injectable()
export class GeminiService implements OnModuleInit {
  private client: GoogleGenAI;
  private analysisModel: string;
  private ttsModel: string;
  private ttsVoice: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
    this.analysisModel = this.configService.getOrThrow<string>('GEMINI_MODEL');
    this.ttsModel = this.configService.getOrThrow<string>('GEMINI_TTS_MODEL');
    this.ttsVoice = this.configService.get<string>('GEMINI_TTS_VOICE') ?? 'Kore';

    const proxyUrl = this.configService.get<string>('GEMINI_PROXY_URL');
    if (proxyUrl) setGlobalDispatcher(new ProxyAgent(proxyUrl));

    this.client = new GoogleGenAI({ apiKey });
  }

  async analyzeAudio(audio: Buffer, mimeType: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.analysisModel,
      contents: [
        {
          role: 'user',
          parts: [{ text: ASSESSMENT_PROMPT }, { inlineData: { mimeType, data: audio.toString('base64') } }],
        },
      ],
    });

    const text = response.text?.trim();
    if (!text) throw new InternalServerErrorException("AI tahlili bo'sh javob qaytardi");
    return text;
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    const response = await this.client.models.generateContent({
      model: this.ttsModel,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.ttsVoice } } },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const data = part?.inlineData?.data;
    if (!data) throw new InternalServerErrorException('TTS modeli audio qaytarmadi');

    const pcm = Buffer.from(data, 'base64');
    return wrapPcmAsWav(pcm, parseSampleRate(part?.inlineData?.mimeType));
  }
}

function parseSampleRate(mimeType: string | undefined): number {
  if (!mimeType) return 24000;
  const match = mimeType.match(/rate=(\d+)/);
  return match ? Number(match[1]) : 24000;
}

function wrapPcmAsWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
