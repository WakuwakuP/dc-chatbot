# Bot deploy target pending

## Status

Pending by user instruction.

## Context

`apps/bot` is a long-running Node.js + `discord.js` Bot Worker. The repository currently has production boundaries and safety rails, but the concrete hosting target is intentionally not selected yet.

Candidates may include a VM/container platform, a managed long-running worker platform, or another operator-controlled runtime. The choice affects secret injection, process supervision, network egress, logging controls, restart policy, and cost.

## Decision

Do not choose or encode a Bot deploy target in the implementation skeleton.

Until the target is selected:

- Keep `apps/bot` deploy scripts target-neutral.
- Do not add platform-specific Bot infrastructure files.
- Keep production Bot token usage behind explicit production configuration.
- Keep Bot access to the Cloudflare Workers API through Cloudflare Access Service Token headers.
- Ensure GitHub Actions deploy skeleton performs preflight checks and prints guidance before any deploy attempt when required secrets or target variables are not configured.

## Required follow-up before Bot deployment

Select and document:

- Bot hosting target
- secret injection mechanism
- process restart/supervision policy
- log redaction/metadata-only guarantees
- deployment rollback/forward-fix policy
- environment variable names and GitHub Actions environment mapping

## Privacy/security note

Deployment logs must remain metadata-only. Do not print Discord message content, Conversation Context content, prompt body, response text, plaintext credential material, attachment URLs/bytes, or provider raw request/response body.
