export type SettingsSectionKey = "scoring" | "roster" | "draft" | "leagues";

export interface SettingsSectionMeta {
  key: SettingsSectionKey;
  label: string;
  description: string;
}

export function resolveSettingsSection(
  section: string | null | undefined
): SettingsSectionKey {
  if (section === "scoring" || section === "roster" || section === "draft" || section === "leagues") {
    return section;
  }
  return "scoring";
}
