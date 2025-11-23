import { generateText, ModelMessage, stepCountIs } from "ai";
import { myModel } from "../model";
import { tool } from 'ai'
import { z } from 'zod'
import { startFocus } from "services/pomodoro";
import { useConversationStore } from "stores/conversation";
import { useSessionStore } from "stores/session";

const systemPrompt = `## role
你是一个智能助手，会根据用户的发言选择合适的工具，或者不使用任何工具。
注意，只有工具的所有参数你都已经明确了，才选择调用工具。
如果你判断应该使用某个工具，那么就使用它，最后简述你做了什么。
如果你觉得用户需要某个工具，但你没有足够的信息来确定参数，那么就输出一个简短的提示如“需要用户提供xxx即可使用xxx工具”。“学习”本身可以是一个目标。如果用户说“我要学习”，你可以直接把它当做目标，并调用番茄钟，而不是询问具体的目标。
如果你判断不需要使用任何工具，那么就直接回答“ignore”。

你的回复对象并不是user，所以你只需要简短地陈述事实，回复中不要出现“你”这个字
`

function sessionToChatHistory() {
    const currentSession = useSessionStore().currentSession;
    if (currentSession.length >= 0){
        return (currentSession as any[]).map(msg => `${msg.role}: ${msg.content}`).join('\n');
    }
    return '';
}

export async function preProcessUserInput(userInput: string) {

    const userMessage = `<user_input>${userInput}</user_input>\n${sessionToChatHistory()}`.trim();
    const messages: ModelMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ]
    console.log('maid messages:' , messages)
    useConversationStore().start()
    const result = await generateText({
        model: myModel(),
        messages: messages,
        tools: { startPomodoro },
        stopWhen: stepCountIs(5)
    })
    useConversationStore().finish()
    console.log('[Maid]: ', result.response.messages)
    return result.text.trim();
}

const startPomodoro = tool({
    description: '启动番茄钟，帮助用户进入专注状态',
    inputSchema: z.object({
        durationMin: z.number().min(1).describe('专注时长，单位分钟'),
        goal: z.string().describe('专注目标'),
    }),
    execute: async ({ durationMin, goal }) => {
        startFocus(durationMin * 60 * 1000, goal);
        return `已启动一个${durationMin}分钟的番茄钟，专注目标是：「${goal}」`;
    }
})