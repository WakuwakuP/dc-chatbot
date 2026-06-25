import type {
  ConfiguredProviderAccessMetadata,
  ConfiguredProviderAccessStatus,
  ProviderKind,
} from "@dc-chatbot/shared";

export function isConfiguredProviderAccessAvailable(
  access: Pick<ConfiguredProviderAccessMetadata, "status">,
): boolean {
  return access.status === "available";
}

export function configuredProviderAccessStatusFromNvidiaNimApiKeyPresence(
  hasNvidiaNimApiKey: boolean,
): ConfiguredProviderAccessStatus {
  return hasNvidiaNimApiKey ? "available" : "not_configured";
}

export function providerKindLabel(kind: ProviderKind): string {
  switch (kind) {
    case "fake":
      return "Fake local provider";
    case "nvidia_nim":
      return "NVIDIA NIM";
  }
}

export function configuredProviderAccessStatusLabelJa(
  status: ConfiguredProviderAccessStatus,
): string {
  switch (status) {
    case "available":
      return "Configured Provider Access available";
    case "not_configured":
      return "NVIDIA NIM API Key not configured";
    case "unavailable":
      return "Configured Provider Access unavailable";
  }
}
