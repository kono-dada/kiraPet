import { MessageFormatSpec } from "services/shared/messageProcessor";
import { usePetStateStore } from "stores/petState";

export const defaultMessageSpec: MessageFormatSpec = {
  prompt: `## 表情列表

${usePetStateStore().getEmotionCodePrompt}

你需要在回复时填写表情编号数字来控制表情。
  
## 回复格式
回复内容必须是中文，严格按照以下格式，以表情编号开头，然后 @ 你要对话的对象，最后写下所有句子：

\`\`\`
[表情编号] @ to
句子1
句子2
句子3
...
\`\`\`

其中， to 可以是['许愿机' | '用户']
## 示例
\`\`\`
[0] @ 用户
今天吃了什么？
我吃了橡木蛋糕卷
\`\`\`

注意：
- 每次回复的句子数量必须不同，可以是2~8句。
- 直接输出内容，不要加反引号
- 你也可以选择不回复。如果你不回复，只需在句子部分填写"..."。
`,

  parse(input: string) {
    const lines = input.trim().split(/\r?\n/).map(l => l.trim());
    if (lines.length === 0) {
      throw new Error("输入为空");
    }
    const firstLine = lines[0];
    let emotionId = 0; // 默认值
    let to: "许愿机" | "用户" | null = null;
    // 情况 1：标准格式 [数字] @ 用户 / 许愿机
    // 例如：[3] @ 用户
    let match = firstLine.match(/^\[(\d+)\]\s*@\s*(许愿机|用户)$/);
    if (match) {
      emotionId = Number(match[1]);
      to = match[2] as "许愿机" | "用户";
    } else {
      // 情况 2：有中括号但数字缺失或非法，例如：
      // [] @ 用户
      // [abc] @ 用户
      match = firstLine.match(/^[^]]\s@\s*(许愿机|用户)$/);
      if (match) {
        // 中括号内容忽略，emotionId 使用默认 0
        to = match[1] as "许愿机" | "用户";
      } else {
        // 情况 3：兼容旧格式：@ 用户
        match = firstLine.match(/^@\s*(许愿机|用户)$/);
        if (match) {
          to = match[1] as "许愿机" | "用户";
          emotionId = 0; // 没有写表情编号，同样默认 0
        }
      }
    }
    if (!to) {
      throw new Error("第一行格式不合法，应为 ‘[数字] @许愿机 / 用户’ 或 ‘@许愿机 / 用户’");
    }
    // 后续行全部视为句子，过滤空行
    const sentences = lines.slice(1).filter(s => s.length > 0);
    return {
      sentences,
      display: true,
      payload: {
        to,
        emotionId
      }
    };
  }
}