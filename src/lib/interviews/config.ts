export type ZoomLinkSource = "custom" | "env" | "disabled" | "none";

export interface EffectiveInterviewZoomSettings {
  zoomEnabled: boolean;
  zoomLink: string;
  source: ZoomLinkSource;
}

export const DEFAULT_INTERVIEW_ZOOM_LINK =
  "https://us05web.zoom.us/j/84798682099?pwd=T8q20lLePlAVSeDk7401FQxYaTzgg5.1";

export function resolveInterviewZoomSettings(raw: unknown, fallbackEnvLink: string): EffectiveInterviewZoomSettings {
  const settings = (raw && typeof raw === "object") ? (raw as Record<string, unknown>) : {};

  const zoomEnabled = typeof settings.zoomEnabled === "boolean" ? settings.zoomEnabled : true;
  const customLink = typeof settings.zoomLink === "string" ? settings.zoomLink.trim() : "";
  const fallback = fallbackEnvLink.trim() || DEFAULT_INTERVIEW_ZOOM_LINK;

  if (!zoomEnabled) {
    return { zoomEnabled: false, zoomLink: "", source: "disabled" };
  }
  if (customLink) {
    return { zoomEnabled: true, zoomLink: customLink, source: "custom" };
  }
  if (fallback) {
    return { zoomEnabled: true, zoomLink: fallback, source: "env" };
  }
  return { zoomEnabled: true, zoomLink: "", source: "none" };
}
