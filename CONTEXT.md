# Discord NVIDIA NIM Private Bot

Discord users use the Private Bot through owner-controlled authorization. The API Worker calls NVIDIA NIM with the configured NVIDIA NIM API key; individual Discord users do not connect personal provider accounts or provide per-user provider credentials.

## Language

**NVIDIA NIM API Key**:
The production provider credential used by the API Worker to call NVIDIA NIM. It is deployment-scoped, configured as a secret such as `NVIDIA_NIM_BEARER_TOKEN`, and never stored in D1, logs, request audit, provider audit, owner notifications, frontend state, docs examples, tests fixtures, or snapshots.
_Avoid_: ChatGPT Subscription Connection, shared session, scraped browser session, user API key

**Configured Provider Access**:
The Private Bot's server-side ability to call NVIDIA NIM through the provider adapter because the NVIDIA NIM API key is configured in the API Worker runtime. Registered Members may use the bot when owner-controlled authorization allows it and Configured Provider Access is available.
_Avoid_: Effective ChatGPT Subscription Connection, fallback connection, shared account

**Discord User**:
A person observed by or using the private Discord bot from Discord. A Discord User may be merely observed, a **Candidate Discord User**, an **Allowed Discord User**, or an **Owner Discord User** depending on separate state. Only an **Allowed Discord User** may receive bot responses. Automated Discord bot or webhook accounts are not Discord Users in the domain sense unless explicitly allowed as automated trigger sources.
_Avoid_: Customer, account, subscriber

**Allowed Discord User**:
A Discord User currently allowed to use the **Private Bot**. The allowlist is the bot's Discord-side access boundary; disabled registered members are not Allowed Discord Users while disabled.
_Avoid_: Customer, subscriber, public user

**Candidate Discord User**:
A temporary candidate state for a **Discord User** observed by the bot but not yet allowed to use the **Private Bot**. The Owner Discord User may promote a Candidate Discord User into a **Registered Member**; candidate state expires when it is no longer recently observed and keeps identity and display snapshots, not message content.
_Avoid_: Applicant, guest, pending customer

**Automated Trigger Source**:
An explicitly allowed Discord bot or webhook source that may trigger the Private Bot even though it is not a domain **Discord User**. Automated Trigger Sources are configured by Admin Owners, use Configured Provider Access, and are constrained by owner assignment, reply mode, and cooldown settings.
_Avoid_: Registered Member, Candidate Discord User, human user

**Member Registration**:
An **Owner Discord User**'s act of adding a Discord User as a **Registered Member**. Registration can be done by entering a Discord user ID directly or by promoting a **Candidate Discord User**. When a Regular Owner registers a member, that member is assigned to the registering Regular Owner for management scope.
_Avoid_: Signup, public registration, self-service registration

**Owner Notification**:
A private notice sent to the configured notification **Owner Discord User** when a non-allowed Discord user directly tries to use the bot by DM. It informs the owner side without replying to the non-allowed user; non-allowed guild mentions are visible in management metadata but do not send DM notifications.
_Avoid_: Public denial, user-facing rejection, moderation alert

**Owner Discord User**:
An Allowed Discord User who manages the Private Bot. Owner Discord Users may have different owner roles; Admin Owners can manage owner-level settings, while Regular Owners can perform day-to-day member management for members assigned to them without changing owner-level settings or provider credential configuration.
_Avoid_: Parent account, shared account, admin account

**Registered Member**:
A Discord User registered by an **Owner Discord User**. A Registered Member may be active or disabled; only active Registered Members are **Allowed Discord Users**. In the MVP, an active Registered Member may use the bot because owner-controlled authorization and Configured Provider Access are available.
_Avoid_: Child user, subaccount, guest

**Private Bot**:
A Discord bot instance operated for the owner and trusted users, not a public multi-user service. It may use a deployment-scoped NVIDIA NIM API key through the API Worker, but it does not expose provider credential material to Discord users, the Bot Worker, or the frontend.
_Avoid_: SaaS bot, public bot, shared public bot

**Conversation Context**:
The recent Discord messages used to make a bot response coherent. It is derived from Discord when needed and is not the bot's own long-term memory.
_Avoid_: Memory, transcript archive, chat history database

**Context Selection**:
The decision about which recent Discord messages belong in **Conversation Context**. DM context is selected from the DM conversation; guild context is selected from a thread, reply chain, or an AI-selected subset of recent channel messages when no thread or reply chain exists.
_Avoid_: Transcript import, channel archive, memory retrieval

**Response Trigger**:
A Discord message pattern that makes the bot consider responding. Direct messages from an **Allowed Discord User** always trigger consideration; guild messages trigger consideration only when the bot is mentioned. Automated bot or webhook messages are ignored by default and can trigger consideration only when explicitly allowed by an Admin Owner.
_Avoid_: Listener, command, subscription

**Response Decision**:
The bot's decision to actually reply after a **Response Trigger**. The decision is rule-based for obvious cases and may use the provider adapter through Configured Provider Access for ambiguous guild mentions.
_Avoid_: Auto-reply, command execution

## Example dialogue

Dev: Can a registered member chat without connecting ChatGPT?
Domain expert: Yes. The active Registered Member can use the Private Bot when owner-controlled authorization allows it and the API Worker has Configured Provider Access through the NVIDIA NIM API key.

Dev: Can a registered member provide their own provider credential in the MVP?
Domain expert: No. The MVP uses the deployment-scoped NVIDIA NIM API key configured for the Private Bot, not per-user provider credentials.
