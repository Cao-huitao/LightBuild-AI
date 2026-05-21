import type { Component } from '../stores/components';

const API_URL = '/deepseek/chat/completions';

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'update_component_styles',
      description:
        '更新当前选中组件的CSS样式。传入的styles对象会合并到组件现有样式上。' +
        '支持：width, height, marginTop, marginRight, marginBottom, marginLeft, ' +
        'borderWidth, borderStyle(solid/dashed/dotted), borderColor, borderRadius, ' +
        'backgroundColor, color, fontSize, shadowX, shadowY, shadowBlur, shadowSpread, shadowColor',
      parameters: {
        type: 'object',
        properties: {
          styles: {
            type: 'object',
            description: '要更新的CSS样式键值对，例如 {"backgroundColor": "#ff0000", "fontSize": 24}',
          },
        },
        required: ['styles'],
      },
    },
  },
];

const SYSTEM_PROMPT = `你是一个低代码编辑器的AI样式助手。你可以通过update_component_styles工具修改当前选中组件的样式。

样式属性说明：
- width/height: 宽高，字符串如 "200px", "100%", "auto"
- marginTop/Right/Bottom/Left: 外边距，数字(px)
- borderWidth: 边框宽度，数字(px)
- borderStyle: 边框样式，solid/dashed/dotted
- borderColor: 边框颜色，如 "#cccccc"
- borderRadius: 圆角，数字(px)
- backgroundColor: 背景色，如 "#ffffff", "rgba(0,0,0,0.1)"
- color: 文字颜色
- fontSize: 字号，数字(px)
- shadowX/Y/Blur/Spread/Color: 阴影属性

规则：
1. 只使用update_component_styles工具，每次调用传入要修改的样式
2. 用中文简短回复，说明做了什么修改
3. 用户说"红色背景"就设backgroundColor为红色，说"大一点"就增大fontSize或width/height
4. 颜色支持中文名称（如"红色"→#ff0000）`;

function getApiKey(): string | null {
  const envKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (envKey) return envKey;
  return localStorage.getItem('ai_api_key');
}

export function saveApiKey(key: string) {
  localStorage.setItem('ai_api_key', key);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

export interface AIContext {
  component: Component | null;
}

export interface AIResponse {
  text: string;
  toolCalls: Array<{
    name: string;
    input: Record<string, any>;
  }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessage(
  message: string,
  context: AIContext,
  conversationHistory: ChatMessage[],
): Promise<AIResponse> {
  const componentInfo = context.component
    ? `当前选中组件: id=${context.component.id}, name=${context.component.name}, props=${JSON.stringify(context.component.props)}`
    : '当前没有选中组件，请提示用户先选择一个组件';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + componentInfo },
    ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const apiKey = getApiKey();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      tools: TOOLS,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API请求失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message;
  const text = msg?.content || '';

  const toolCalls: AIResponse['toolCalls'] = [];
  if (msg?.tool_calls) {
    for (const tc of msg.tool_calls) {
      if (tc.type === 'function') {
        let input: Record<string, any> = {};
        try {
          input = JSON.parse(tc.function.arguments);
        } catch {
          input = {};
        }
        toolCalls.push({ name: tc.function.name, input });
      }
    }
  }

  return { text, toolCalls };
}
