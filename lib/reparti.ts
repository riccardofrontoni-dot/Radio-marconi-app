export const REPARTI = [
  { value: "speaker", label: "Speaker", color: "#DC2626" },
  { value: "social", label: "Social media", color: "#C2410C" },
  { value: "tecnico_video", label: "Tecnico video", color: "#7C3AED" },
  { value: "tecnico_audio", label: "Tecnico audio", color: "#0F766E" },
  { value: "qualita", label: "Qualità", color: "#0369A1" },
] as const;

export function repartoColor(v: string | null | undefined): string {
  return REPARTI.find((r) => r.value === v)?.color ?? "#6E6E73";
}
export function repartoLabel(v: string | null | undefined): string {
  return REPARTI.find((r) => r.value === v)?.label ?? v ?? "";
}
