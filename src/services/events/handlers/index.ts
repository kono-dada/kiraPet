import { type HandlerDescriptor } from "../handlerManager";
import { handleWindowActive, handleWindowActiveSummary } from "./onActiveWindowEvents";
import { handleAvatarMultiClick } from "./onAvatarMultiClick";
import { handleTriggerLLM } from "./onTriggerLLM";

// Central registry for all event handlers (flat, per-file features)
export function allHandlerDescriptors(): HandlerDescriptor<any>[] {
  const dAvatarMultiClick: HandlerDescriptor<'AVATAR_MULTI_CLICK'> = {
    key: 'interaction:avatar-multi-click-demo',
    event: 'AVATAR_MULTI_CLICK',
    blocking: true,
    isEnabled: () => true, // wire to a setting if needed later
    handle: handleAvatarMultiClick,
  };

  const dWindowActive: HandlerDescriptor<'WINDOW_ACTIVE_MINUTE'> = {
    key: 'window-active',
    event: 'WINDOW_ACTIVE_MINUTE',
    blocking: false,
    isEnabled: () => true,
    handle: handleWindowActiveSummary,
  };

  const dWindowActiveRaw: HandlerDescriptor<'WINDOW_ACTIVE'> = {
    key: 'window-active-raw',
    event: 'WINDOW_ACTIVE',
    blocking: false,
    isEnabled: () => true,
    handle: handleWindowActive,
  };

  const dTriggerLLM: HandlerDescriptor<'TRIGGER_LLM'> = {
    key: 'trigger-llm',
    event: 'TRIGGER_LLM',
    blocking: false,
    isEnabled: () => true,
    handle: handleTriggerLLM,
  };

  return [
    dAvatarMultiClick,
    dWindowActive,
    dWindowActiveRaw,
    dTriggerLLM
  ];
}

