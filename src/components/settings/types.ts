export type SettingsSectionKey = "scoring" | "roster" | "draft";

export interface SettingsSectionMeta {
  key: SettingsSectionKey;
  label: string;
  description: string;
}

export function resolveSettingsSection(
  section: string | null | undefined
): SettingsSectionKey {
  if (section === "scoring" || section === "roster" || section === "draft") {
    return section;
  }
  return "scoring";
}
