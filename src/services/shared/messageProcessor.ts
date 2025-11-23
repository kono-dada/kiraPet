/**
 * 为什么会存在这个文件？
 * 这是需要把 llm 的输出解析成含有多条消息、多种信息的结构化数据，并且不同的解析方式对应不同的prompt。
 * 所以把 prompt 和 parse 函数放在一起，形成一个 MessageFormatSpec。
 */

interface ParseResult {
  sentences: string[];
  display: boolean,
  payload: any;
}

export interface MessageFormatSpec {
  /** 
   * 用来指导模型生成消息格式的 prompt
   * 例如：必须以 "@ to" 开头、必须全中文等
   */
  prompt: string;

  /**
   * 将生成的消息解析成 [to, sentences] 的函数
   * @param content 生成的整段消息文本
   * @returns [string[], any] —— 你可以根据需要替换 any，例如 ParsedResult
   */
  parse: (content: string) => ParseResult;
}

export interface UserMessageFormatSpec {
    construct: (content: string) => string;
    parse: (content: string) => string;
}

export const defaultUserMessageFormatSpec: UserMessageFormatSpec = {
    construct(content: string): string {
        return `<time>${new Date().toISOString()}</time><userMessage>${content}</userMessage>`;
    },
    parse(content: string): string {
        const match = content.match(/<userMessage>([\s\S]*?)<\/userMessage>/);
        if (match) {
            return match[1].trim();
        } else {
            throw new Error("无法解析用户消息内容");
        }
    }
}   