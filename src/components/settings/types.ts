export type SettingsSectionKey =
  | "scoring"
  | "roster"
  | "draft"
  | "leagues"
  | "projections";

export interface SettingsSectionMeta {
  key: SettingsSectionKey;
  label: string;
  description: string;
}

export function resolveSettingsSection(
  section: string | null | undefined
): SettingsSectionKey {
  if (
    section === "projections" ||
    section === "scoring" ||
    section === "roster" ||
    section === "draft" ||
    section === "leagues"
  ) {
    return section;
  }
  return "scoring";
}
