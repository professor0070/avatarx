import type { Request, Response } from 'express';
import { OllamaService } from '../services/ollama.service';

export async function ollamaStatusHandler(_req: Request, res: Response) {
  try {
    const running = await OllamaService.isRunning();
    const models = running ? (await OllamaService.listModels() as { models: unknown[] }) : { models: [] };
    res.json({
      ok: true,
      data: {
        running,
        models: models.models,
      },
    });
  } catch (error) {
    console.error('[avatarx-server] ollama status error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function ollamaGenerateHandler(req: Request, res: Response) {
  try {
    const { prompt, system, temperature, maxTokens } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ ok: false, error: { message: 'Prompt is required' } });
      return;
    }

    const result = await OllamaService.generate({
      prompt,
      system,
      temperature,
      maxTokens,
    }) as { response: string };

    res.json({ ok: true, data: { response: result.response } });
  } catch (error) {
    console.error('[avatarx-server] ollama generate error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}

export async function ollamaChatHandler(req: Request, res: Response) {
  try {
    const { messages, temperature, maxTokens } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ ok: false, error: { message: 'Messages array is required' } });
      return;
    }

    const result = await OllamaService.chat({
      messages,
      temperature,
      maxTokens,
    }) as { message: unknown };

    res.json({ ok: true, data: { message: result.message } });
  } catch (error) {
    console.error('[avatarx-server] ollama chat error:', error);
    res.status(500).json({ ok: false, error: { message: 'Internal server error' } });
  }
}
