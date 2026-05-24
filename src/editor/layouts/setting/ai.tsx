import React, { useRef, useEffect, useState } from 'react';
import { Input, Button, Typography, Spin, Tag } from 'antd';
import { SendOutlined, KeyOutlined, ClearOutlined } from '@ant-design/icons';
import { sendMessage, saveApiKey, hasApiKey, type ChatMessage } from '../../utils/ai-service';
import { useComponents, useSelectedComponent } from '../../stores/components';
import { useAIChatStore } from '../../stores/ai-chat';

const { Text } = Typography;

const ComponentAI: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(!hasApiKey());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useAIChatStore((s) => s.messages);
  const addMessage = useAIChatStore((s) => s.addMessage);
  const clearMessages = useAIChatStore((s) => s.clearMessages);

  const curComponent = useSelectedComponent();
  const updateComponentStyles = useComponents((s) => s.updateComponentStyles);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSaveApiKey() {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      setShowApiKey(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    if (!curComponent) {
      addMessage({ role: 'user', content: text });
      addMessage({ role: 'assistant', content: '请先在画布上选中一个组件。' });
      setInput('');
      return;
    }

    setLoading(true);
    addMessage({ role: 'user', content: text });
    setInput('');

    try {
      const response = await sendMessage(
        text,
        { component: curComponent },
        messages,
      );

      for (const tc of response.toolCalls) {
        if (tc.name === 'update_component_styles') {
          updateComponentStyles(curComponent.id, tc.input.styles);
        }
      }

      const reply = response.text || (response.toolCalls.length > 0 ? '样式已更新' : '完成');
      addMessage({ role: 'assistant', content: reply });
    } catch (err: any) {
      const errorMsg = err.message || '请求失败';
      addMessage({ role: 'assistant', content: `错误: ${errorMsg}` });
      if (errorMsg.includes('API Key') || errorMsg.includes('401')) {
        setShowApiKey(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {showApiKey && (
        <div className="p-3 bg-orange-50 border-b border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <KeyOutlined className="text-orange-500" />
            <Text className="text-xs text-orange-700">设置 DeepSeek API Key（存储在本地浏览器）</Text>
          </div>
          <div className="flex gap-2">
            <Input.Password
              size="small"
              placeholder="输入 API Key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onPressEnter={handleSaveApiKey}
            />
            <Button size="small" type="primary" onClick={handleSaveApiKey}>
              保存
            </Button>
          </div>
        </div>
      )}

      {curComponent && (
        <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-500 flex items-center gap-2">
          <span>当前:</span>
          <Tag color="blue">{curComponent.name}</Tag>
          <span>ID: {curComponent.id}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-2 min-h-[200px] max-h-[350px]">
        {messages.length === 0 && (
          <div className="text-gray-400 text-xs text-center py-8">
            输入样式修改指令，如：<br />
            "背景改为蓝色，加阴影"<br />
            "字体调大一些，变红色"
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-1.5 rounded-lg text-xs ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-1.5 rounded-lg">
              <Spin size="small" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t flex gap-2">
        {messages.length > 0 && (
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={clearMessages}
            title="清空对话"
          />
        )}
        <div className="flex-1 flex gap-2">
          <Input
            size="small"
            placeholder={curComponent ? '描述样式修改...' : '请先选中组件'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSend}
            disabled={loading}
          />
          <Button
            size="small"
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default ComponentAI;
