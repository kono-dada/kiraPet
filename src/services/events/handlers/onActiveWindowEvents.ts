import { getRandomColor, pushLog } from "src/pages/main/eventLogBus";
import { EventPayloadMap } from "../appEvents";
import { pushFocusEvent } from "services/pomodoro";


export async function handleWindowActiveSummary(payload: EventPayloadMap['WINDOW_ACTIVE_MINUTE']) {
  pushLog(`${Object.keys(payload.by_title_app)}`, getRandomColor());
  // 把事件递交给番茄钟。如果番茄钟在工作中，则会进行分心检测
  pushFocusEvent(payload);
}

export async function handleWindowActive(_payload: EventPayloadMap['WINDOW_ACTIVE']) {
  // console.log(`${_payload.title} - ${_payload.app_name}`)
  // pushLog(`${_payload.title} - ${_payload.app_name}`, getRandomColor());
}