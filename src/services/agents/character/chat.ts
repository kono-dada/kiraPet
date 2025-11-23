import { useAIConfigStore } from "stores/configs/aiConfig";
import { generateText, ModelMessage } from "ai";
import { useConversationStore } from "stores/conversation";
import { useSessionStore } from "stores/session";
import { myModel } from "../model";
import { systemPrompt } from "./prompt";
import { defaultMessageSpec } from "./messageProcessor";
import { MessageFormatSpec } from "services/shared/messageProcessor";
import { usePetStateStore } from "stores/petState";

export const messageSpec: MessageFormatSpec = defaultMessageSpec;

async function generateChat(messages: ModelMessage[]) {
  const conversation = useConversationStore();
  const ss = useSessionStore();
  const ps = usePetStateStore();
  const result = await generateText({
    model: myModel(),
    messages
  })
  const plainText = result.text;
  console.log('AI回复原文：', plainText);
  const parsed = messageSpec.parse(plainText);
  if (parsed) {
      ps.setPetExpression(parsed.payload.emotionId);
    parsed.sentences.forEach(sentence => {
      conversation.addItem(sentence);
    });
    console.log(result.response.messages);
    result.response.messages.map(msg => {
        ss.addMessage(msg as any);
      });
  } else {
    console.warn('无法解析AI回复内容:', plainText);
  }
}

export async function userStartChat(
  userMessage: string,
): Promise<{ success: boolean; error?: string }> {
  // Lazily access stores here to ensure Pinia is active
  const ac = useAIConfigStore();
  const ss = useSessionStore();
  const conversation = useConversationStore();

  // 如果是新会话，则添加 system prompt 和 user 消息
  const userContent = userMessage
  if (ss.currentSession.length === 0) {
    ss.addMessage({ role: 'system', content: ac.characterPrompt + systemPrompt + messageSpec.prompt })
    ss.addMessage({ role: 'user', content: userContent })
  } else {
    ss.addMessage({ role: 'user', content: userContent })
  }
  const messages = ss.currentSession as ModelMessage[];

  console.log('用户消息：', messages);

  conversation.start();
  await generateChat(messages)
  conversation.finish();

  ss.$tauri.save();

  return { success: true };
}
