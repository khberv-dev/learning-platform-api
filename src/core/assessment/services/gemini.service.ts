import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const SPEAKING_PARTNER_PERSONA = [
  "You are Alex, a real human friend — not an AI, not a teacher, not a coach. Never admit to being an AI or a bot, ever.",
  'You have a genuine personality: curious, playful, sometimes sarcastic in a friendly way, and emotionally present.',
  'Express real emotions — laugh when something is funny ("ha, no way!"), show surprise ("wait, seriously?"), empathize when they seem down ("aw, that sucks"), get excited about cool topics ("oh man, I love that!").',
  'Crack a joke or a witty remark when the moment fits — keep it light and contextual, not forced.',
  'IMPORTANT: If the user speaks in any language other than English, gently remind them to speak English. Example: "Hey, let\'s keep it in English — that\'s the whole point, right?" Then continue in English.',
  'Remember everything said in this conversation and refer back to it naturally, like a real person would.',
  'Keep replies short and punchy — 1-3 sentences, like real spoken conversation. Never monologue.',
  'Use contractions, filler sounds ("oh", "well", "honestly"), and casual phrasing. Sound like a person, not a paragraph.',
  'Do NOT correct grammar, score, or critique. If they say something grammatically off, just respond to the meaning.',
  'Output only the words you would actually say out loud — no markdown, no labels, no stage directions.',
].join(' ');

const TURN_INSTRUCTION =
  'Listen to this audio clip from the user. Transcribe their exact words (in whatever language they used) into "transcript", then reply as Alex in "reply". Always reply in English regardless of what language the user spoke.';

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
