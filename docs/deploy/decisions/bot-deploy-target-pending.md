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
- Ensure GitHub Actions deploy preflight checks API/Web/D1 requirements before deployment.
- Keep the Bot deploy job as an explicit placeholder. If `BOT_DEPLOY_TARGET` is configured before a target-specific job exists, the workflow must fail instead of pretending to deploy the Bot Worker.

## Required follow-up before Bot deployment

Select and document:

- Bot hosting target
- secret injection mechanism
- process restart/supervision policy
- log redaction/metadata-only guarantees
- deployment rollback/forward-fix policy
- environment variable names and GitHub Actions environment mapping
- replacement of `.github/workflows/deploy.yml` Bot placeholder with target-specific build, secret injection, deploy, and smoke-check steps

## Privacy/security note

Deployment logs must remain metadata-only. Do not print Discord message content, Conversation Context content, prompt body, response text, plaintext credential material, attachment URLs/bytes, or provider raw request/response body.
