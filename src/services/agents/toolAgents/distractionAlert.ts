import { generateText, ModelMessage } from "ai";
import { myModel } from "../model";
import { EventPayloadMap } from "services/events/appEvents";

const systemPrompt = `## role
你是一个专注教练，帮助用户保持专注于当前任务。
你将会收到用户的窗口活动摘要以及他们的专注目标。请根据提示判断用户是否分心。

## data
你接收到的信息将会是 title - app_name 的格式。这表明用户在过去1分钟内使用 app_name 进行 title 的活动超过了30秒
你需要综合这两部分信息，以及用户的专注目标来判断用户的专注状态。
注意：如果app的名称包含“pet”，请忽略它，因为这是用户的桌宠应用。

## format
按照以下格式回复：
如果检测到可疑的app或网站，推测用户在做什么分心的活动，输出你的推测。不超过50字。
如果没有检测到分心活动，直接回复“OK”。
`

function findKeyAbove30(record: Record<string, number>): string | undefined {
  for (const key in record) {
    if (record[key] > 30) {
      return key;
    }
  }
}

export async function checkActivity(windowActivitySummary: EventPayloadMap['WINDOW_ACTIVE_MINUTE'], goal: string, notes: string | null = null) {
  const suspiciousTitle = findKeyAbove30(windowActivitySummary.by_title_app);
  if (!suspiciousTitle) {
    return 'OK';
  }
  const userMessage = `窗口活动：${suspiciousTitle}\n专注目标：${goal}` + (notes ? `\n## 备注 ${notes}` : '');
  const messages: ModelMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]
  const result = await generateText({
    model: myModel(),
    messages: messages
  })
  console.log('[distractionAlert]：', result.text.trim());
  return result.text.trim();
}