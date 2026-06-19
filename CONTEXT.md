# Discord ChatGPT Bot

Discord users use ChatGPT through their own subscription-backed entitlement or through the Owner Discord User's delegated subscription connection.

## Language

**Connected ChatGPT Account**:
A ChatGPT account connected by an individual Discord user. The connected account owns a **ChatGPT Subscription Connection** that may be used by that user or delegated to registered members when that user is an **Owner Discord User**.
_Avoid_: Bot subscription, API key, scraped browser session

**ChatGPT Subscription Connection**:
The active connection that lets a Discord user use subscription-backed ChatGPT entitlement through the bot. It belongs to exactly one **Discord User**, and each **Discord User** has at most one direct connection.
_Avoid_: API key, shared session, scraped browser session

**Effective ChatGPT Subscription Connection**:
The **ChatGPT Subscription Connection** actually used for a bot response. A Discord User's own direct connection is preferred; if absent, the bot may use the Registered Member's assigned **Owner Discord User** connection.
_Avoid_: Billing account, fallback API key, global bot connection

**Discord User**:
A person observed by or using the private Discord bot from Discord. A Discord User may be merely observed, a **Candidate Discord User**, an **Allowed Discord User**, or the **Owner Discord User** depending on separate state. Only an **Allowed Discord User** may receive bot responses, create a **ChatGPT Subscription Connection**, or inherit the **Owner Discord User**'s connection. Automated Discord bot or webhook accounts are not Discord Users in the domain sense unless explicitly allowed as automated trigger sources.
_Avoid_: Customer, account, subscriber

**Allowed Discord User**:
A Discord User currently allowed to use the **Private Bot**. The allowlist is the bot's Discord-side access boundary; disabled registered members are not Allowed Discord Users while disabled.
_Avoid_: Customer, subscriber, public user

**Candidate Discord User**:
A temporary candidate state for a **Discord User** observed by the bot but not yet allowed to use the **Private Bot**. The Owner Discord User may promote a Candidate Discord User into a **Registered Member**; candidate state expires when it is no longer recently observed and keeps identity and display snapshots, not message content.
_Avoid_: Applicant, guest, pending customer

**Automated Trigger Source**:
An explicitly allowed Discord bot or webhook source that may trigger the Private Bot even though it is not a domain **Discord User**. Automated Trigger Sources are configured by Admin Owners, use an assigned Owner Discord User's ChatGPT Subscription Connection, and are constrained by reply mode and cooldown settings.
_Avoid_: Registered Member, Candidate Discord User, human user

**Member Registration**:
An **Owner Discord User**'s act of adding a Discord User as a **Registered Member**. Registration can be done by entering a Discord user ID directly or by promoting a **Candidate Discord User**. When a Regular Owner registers a member, that member is assigned to the registering Regular Owner's ChatGPT Subscription Connection.
_Avoid_: Signup, public registration, self-service registration

**Owner Notification**:
A private notice sent to the configured notification **Owner Discord User** when a non-allowed Discord user directly tries to use the bot by DM. It informs the owner side without replying to the non-allowed user; non-allowed guild mentions are visible in management metadata but do not send DM notifications.
_Avoid_: Public denial, user-facing rejection, moderation alert

**Owner Discord User**:
An Allowed Discord User who manages the Private Bot. Owner Discord Users may have different owner roles; Admin Owners can manage owner-level settings, while Regular Owners can perform day-to-day member management for members assigned to their own ChatGPT Subscription Connection without changing owner-level settings or connection assignment. An Owner Discord User's **ChatGPT Subscription Connection** may be assigned to registered members as their fallback connection when they do not have a direct connection.
_Avoid_: Parent account, shared account, admin account

**Registered Member**:
A Discord User registered by an **Owner Discord User**. A Registered Member may be active or disabled; only active Registered Members are **Allowed Discord Users**. In the MVP, an active Registered Member uses an assigned Owner Discord User's connection; the model allows a future direct **ChatGPT Subscription Connection** for the member.
_Avoid_: Child user, subaccount, guest

**Private Bot**:
A Discord bot instance operated for the owner and trusted users, not a public multi-user service. It may hold sensitive **ChatGPT Subscription Connections** for its trusted users.
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
The bot's decision to actually reply after a **Response Trigger**. The decision is rule-based for obvious cases and may use an AI classifier through the triggering user's **Effective ChatGPT Subscription Connection** for ambiguous guild mentions.
_Avoid_: Auto-reply, command execution

## Example dialogue

Dev: Can a registered member chat without connecting ChatGPT?
Domain expert: Yes, if the Owner Discord User has a ChatGPT Subscription Connection available as fallback.

Dev: Can a registered member connect their own ChatGPT account in the MVP?
Domain expert: No. The MVP uses the Owner Discord User's connection for registered members, but the model leaves room for member-owned connections later.
