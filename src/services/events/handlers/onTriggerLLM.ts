import { userStartChat } from "services/agents/character/chat";
import { EventPayloadMap } from "../appEvents";

export async function handleTriggerLLM(payload: EventPayloadMap['TRIGGER_LLM']) {
  userStartChat(payload.prompt);
}