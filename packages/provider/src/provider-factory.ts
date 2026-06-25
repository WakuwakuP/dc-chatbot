import { FakeLLMProvider } from "./fake-provider";
import {
  NvidiaNimLLMProvider,
  ProviderError,
  type NvidiaNimLLMProviderOptions,
} from "./nvidia-nim-provider";
import type { LLMProvider, LLMProviderKind } from "./types";

export type CreateLLMProviderOptions = {
  providerKind?: LLMProviderKind;
  nvidiaNim?: NvidiaNimLLMProviderOptions;
};

export function createLLMProvider(
  options: CreateLLMProviderOptions = {},
): LLMProvider {
  switch (options.providerKind ?? "fake") {
    case "fake":
      return new FakeLLMProvider();
    case "nvidia_nim":
      if (!options.nvidiaNim) {
        throw new ProviderError(
          "not_configured",
          "NVIDIA NIM provider options are required",
        );
      }
      return new NvidiaNimLLMProvider(options.nvidiaNim);
  }
}
