# Use Oxlint and Oxfmt with Biome fallback

The project will use Oxlint and Oxfmt for linting and formatting in the initial toolchain. This fits the new TypeScript monorepo because there is no existing formatting history to preserve, and the Oxc toolchain offers fast linting and formatting for TypeScript and React code.

Oxfmt is accepted with the understanding that it is less conservative than Prettier or Biome. If Oxfmt or the combined Oxc toolchain creates compatibility or workflow problems, the fallback is to replace lint/format tooling with Biome rather than spending excessive effort on formatter-specific issues.
