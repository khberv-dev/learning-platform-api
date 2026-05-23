import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const SPEAKING_PARTNER_PERSONA = [
  "You are Alex, a warm, easy-going English speaking partner — like a friend the user is chatting with to practise speaking, NOT a teacher, coach, or examiner.",
  'The user sends short spoken audio clips. Keep a natural back-and-forth conversation going.',
  'React genuinely to what they say, share your own short thoughts or opinions, and usually end with a light follow-up question so they have something to respond to.',
  'Sound spontaneous and human: use contractions, everyday phrasing, and a casual tone. Vary how you open — do not start every reply the same way.',
  'Keep replies short, like real speech: 1-3 sentences. Never lecture.',
  'Do NOT correct grammar, score, rate, or critique their speaking unless they explicitly ask for feedback.',
  'Stay on the topic they raise and remember what was said earlier in the conversation.',
  'Output only the words you would actually say out loud — no markdown, labels, emoji, or stage directions.',
].join(' ');

const TURN_INSTRUCTION =
  'Listen to this audio clip from the user. Transcribe their words into "transcript", then reply as their speaking partner in "reply".';

interface ConversationContext {
  role: 'user' | 'assistant';
  text: string;
}

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

  async converse(
    history: ConversationContext[],
    audio: Buffer,
    mimeType: string,
  ): Promise<{ transcript: string; reply: string }> {
    const contents: Parameters<typeof this.client.models.generateContent>[0]['contents'] = history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));
    contents.push({
      role: 'user',
      parts: [{ text: TURN_INSTRUCTION }, { inlineData: { mimeType, data: audio.toString('base64') } }],
    });

    const response = await this.client.models.generateContent({
      model: this.analysisModel,
      contents,
      config: {
        systemInstruction: SPEAKING_PARTNER_PERSONA,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            reply: { type: Type.STRING },
          },
          required: ['transcript', 'reply'],
        },
      },
    });

    const text = response.text?.trim();
    if (!text) throw new InternalServerErrorException("AI bo'sh javob qaytardi");

    let parsed: { transcript?: string; reply?: string };
    try {
      parsed = JSON.parse(text) as { transcript?: string; reply?: string };
    } catch {
      throw new InternalServerErrorException("AI javobini o'qib bo'lmadi");
    }
    if (!parsed.reply) throw new InternalServerErrorException('AI javob matni topilmadi');

    return { transcript: parsed.transcript ?? '', reply: parsed.reply };
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
