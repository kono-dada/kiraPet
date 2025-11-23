import { useAIConfigStore } from "stores/configs/aiConfig";
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { fetch } from "@tauri-apps/plugin-http";
import { LanguageModel } from "ai";

export function myModel(): LanguageModel {
  const ac = useAIConfigStore();
  const model = createOpenAICompatible({
    baseURL: ac.baseURL,
    name: ac.model,
    apiKey: ac.apiKey, 
    fetch: fetch
  });

  return model(ac.model);
}