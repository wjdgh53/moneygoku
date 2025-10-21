/**
 * OpenAI Client Configuration
 *
 * OpenAI API를 사용하기 위한 설정 및 헬퍼 함수
 */

import OpenAI from 'openai';

/**
 * OpenAI 클라이언트 인스턴스
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GPT 모델 타입
 */
export const GPT_MODELS = {
  GPT4: 'gpt-4-turbo-preview',
  GPT4_MINI: 'gpt-4-turbo',
  GPT3_5: 'gpt-3.5-turbo',
  GPT4_O: 'gpt-4o',
  GPT4_O_MINI: 'gpt-4o-mini',
} as const;

export type GPTModel = (typeof GPT_MODELS)[keyof typeof GPT_MODELS];

/**
 * OpenAI API 호출 옵션
 */
export interface OpenAICallOptions {
  model?: GPTModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * 간단한 텍스트 생성 헬퍼 함수
 */
export async function generateText(
  prompt: string,
  options: OpenAICallOptions = {}
): Promise<string> {
  const {
    model = GPT_MODELS.GPT4_O_MINI, // 기본값: 가장 빠르고 저렴한 모델
    temperature = 0.7,
    maxTokens = 500,
    systemPrompt,
  } = options;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  const response = await openai.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || '';
}
