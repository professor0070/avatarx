const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b';

export interface OllamaGenerateOptions {
  prompt: string;
  system?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  messages: OllamaChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export class OllamaService {
  private static baseUrl = OLLAMA_BASE_URL;
  private static model = MODEL;

  static setModel(model: string) {
    this.model = model;
  }

  static async listModels() {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
    return res.json();
  }

  static async generate(options: OllamaGenerateOptions) {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: options.prompt,
        system: options.system,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2048,
        },
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
    return res.json();
  }

  static async chat(options: OllamaChatOptions) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2048,
        },
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
    return res.json();
  }

  static async isRunning(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }
}
