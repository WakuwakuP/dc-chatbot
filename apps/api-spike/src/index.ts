import { asc, count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import type {
  NewChatGptConnection,
  NewDiscordUser,
  NewOwner,
  NewRegisteredMember,
  RegisteredMember,
} from "./db/schema";

type Env = {
  DB: D1Database;
};

type AuthOwner = {
  discordUserId: string;
  role: "admin" | "regular";
  status: "active" | "disabled";
};

type CheckResult = {
  name: string;
  ok: boolean;
  category: "compatible" | "limitation";
  detail?: unknown;
};

type SpikeSummary = {
  ok: boolean;
  compatible: boolean;
  limitationsConfirmed: boolean;
  checks: CheckResult[];
};

type AccessPolicyAction = "registeredMember.read" | "registeredMember.create" | "registeredMember.update";
type AccessPolicyReason = "owner_disabled" | "not_assigned_owner" | "assigned_owner_changed" | "not_found";

type SafeErrorDetail = {
  category: string;
  message: string;
  action?: AccessPolicyAction;
  reason?: AccessPolicyReason;
};

type ExpectedError = {
  matched: boolean;
  error?: SafeErrorDetail;
};

type TransactionCapableDb = {
  transaction?: (operation: (tx: unknown) => unknown) => unknown;
};

const now = () => new Date().toISOString();

function makeClient(env: Env) {
  return drizzle(env.DB, { schema });
}

type Db = ReturnType<typeof makeClient>;

class AccessPolicyError extends Error {
  readonly category = "access_policy";

  constructor(
    readonly action: AccessPolicyAction,
    readonly reason: AccessPolicyReason,
  ) {
    super(`Access denied by spike policy: ${action}/${reason}`);
  }
}

function isAccessPolicyError(error: unknown): error is AccessPolicyError {
  return error instanceof AccessPolicyError;
}

function toSafeErrorDetail(error: unknown): SafeErrorDetail {
  if (isAccessPolicyError(error)) {
    return {
      category: error.category,
      message: error.message,
      action: error.action,
      reason: error.reason,
    };
  }

  if (error instanceof Error) {
    return { category: "unexpected_error", message: error.message };
  }

  return { category: "unexpected_error", message: String(error) };
}

function toSafeResponseError(error: unknown): SafeErrorDetail {
  if (isAccessPolicyError(error)) {
    return toSafeErrorDetail(error);
  }

  return { category: "spike_execution_failed", message: "Spike execution failed" };
}

function isTransactionUnsupported(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("transaction") && (message.includes("unsupported") || message.includes("not supported"));
}

function isAccessDenied(error: unknown) {
  return isAccessPolicyError(error);
}

async function expectError(operation: () => Promise<unknown>, predicate: (error: unknown) => boolean): Promise<ExpectedError> {
  try {
    await operation();
    return { matched: false };
  } catch (error) {
    return {
      matched: predicate(error),
      error: toSafeErrorDetail(error),
    };
  }
}

async function reset(db: Db) {
  await db.delete(schema.registeredMembers).run();
  await db.delete(schema.chatGptConnections).run();
  await db.delete(schema.owners).run();
  await db.delete(schema.discordUsers).run();
}

async function seed(db: Db) {
  const createdAt = now();

  const discordUsers = [
    { id: "100", username: "admin", displayName: "Admin", createdAt, updatedAt: createdAt },
    { id: "200", username: "regular-a", displayName: "Regular A", createdAt, updatedAt: createdAt },
    { id: "300", username: "regular-b", displayName: "Regular B", createdAt, updatedAt: createdAt },
    { id: "900", username: "member-a", displayName: "Member A", createdAt, updatedAt: createdAt },
    { id: "901", username: "member-b", displayName: "Member B", createdAt, updatedAt: createdAt },
    { id: "902", username: "member-c", displayName: "Member C", createdAt, updatedAt: createdAt },
    { id: "903", username: "member-d", displayName: "Member D", createdAt, updatedAt: createdAt },
  ] satisfies NewDiscordUser[];

  await db.insert(schema.discordUsers).values(discordUsers).run();

  const owners = [
    {
      discordUserId: "100",
      accessSubject: "access-admin",
      accessEmail: "admin@example.test",
      role: "admin",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      discordUserId: "200",
      accessSubject: "access-regular-a",
      accessEmail: "regular-a@example.test",
      role: "regular",
      status: "active",
      createdAt,
      updatedAt: createdAt,
    },
    {
      discordUserId: "300",
      accessSubject: "access-regular-b",
      accessEmail: "regular-b@example.test",
      role: "regular",
      status: "disabled",
      createdAt,
      updatedAt: createdAt,
    },
  ] satisfies NewOwner[];

  await db.insert(schema.owners).values(owners).run();

  const chatGptConnections = [
    { ownerDiscordUserId: "100", status: "active", createdAt, updatedAt: createdAt },
    { ownerDiscordUserId: "200", status: "active", createdAt, updatedAt: createdAt },
  ] satisfies NewChatGptConnection[];

  await db.insert(schema.chatGptConnections).values(chatGptConnections).run();

  const registeredMembers = [
    { discordUserId: "900", assignedOwnerDiscordUserId: "200", status: "active", createdAt, updatedAt: createdAt },
    { discordUserId: "901", assignedOwnerDiscordUserId: "100", status: "active", createdAt, updatedAt: createdAt },
  ] satisfies NewRegisteredMember[];

  await db.insert(schema.registeredMembers).values(registeredMembers).run();
}

function assertActiveOwner(auth: AuthOwner, action: AccessPolicyAction) {
  if (auth.status !== "active") {
    throw new AccessPolicyError(action, "owner_disabled");
  }
}

async function findRegisteredMember(db: Db, discordUserId: string) {
  return db.select().from(schema.registeredMembers).where(eq(schema.registeredMembers.discordUserId, discordUserId)).get();
}

function assertCanCreateRegisteredMember(auth: AuthOwner, data: NewRegisteredMember) {
  const action = "registeredMember.create";
  assertActiveOwner(auth, action);

  if (auth.role === "admin") {
    return;
  }

  if (data.assignedOwnerDiscordUserId !== auth.discordUserId) {
    throw new AccessPolicyError(action, "not_assigned_owner");
  }
}

function assertCanUpdateRegisteredMember(auth: AuthOwner, before: RegisteredMember, patch: RegisteredMemberPatch) {
  const action = "registeredMember.update";
  assertActiveOwner(auth, action);

  if (auth.role === "admin") {
    return;
  }

  if (before.assignedOwnerDiscordUserId !== auth.discordUserId) {
    throw new AccessPolicyError(action, "not_assigned_owner");
  }

  const afterAssignedOwnerDiscordUserId = patch.assignedOwnerDiscordUserId ?? before.assignedOwnerDiscordUserId;
  if (afterAssignedOwnerDiscordUserId !== auth.discordUserId) {
    throw new AccessPolicyError(action, "assigned_owner_changed");
  }
}

type RegisteredMemberPatch = Partial<
  Pick<RegisteredMember, "assignedOwnerDiscordUserId" | "status" | "updatedAt">
>;

async function readRegisteredMembersForOwner(db: Db, auth: AuthOwner) {
  if (auth.status !== "active") {
    return [];
  }

  if (auth.role === "admin") {
    return db.select().from(schema.registeredMembers).orderBy(asc(schema.registeredMembers.discordUserId)).all();
  }

  return db
    .select()
    .from(schema.registeredMembers)
    .where(eq(schema.registeredMembers.assignedOwnerDiscordUserId, auth.discordUserId))
    .orderBy(asc(schema.registeredMembers.discordUserId))
    .all();
}

async function createRegisteredMember(db: Db, auth: AuthOwner, data: NewRegisteredMember) {
  assertCanCreateRegisteredMember(auth, data);
  await db.insert(schema.registeredMembers).values(data).run();

  const created = await findRegisteredMember(db, data.discordUserId);
  if (!created) {
    throw new AccessPolicyError("registeredMember.create", "not_found");
  }

  return created;
}

async function updateRegisteredMember(db: Db, auth: AuthOwner, discordUserId: string, patch: RegisteredMemberPatch) {
  const before = await findRegisteredMember(db, discordUserId);
  if (!before) {
    throw new AccessPolicyError("registeredMember.update", "not_found");
  }

  assertCanUpdateRegisteredMember(auth, before, patch);
  await db.update(schema.registeredMembers).set(patch).where(eq(schema.registeredMembers.discordUserId, discordUserId)).run();

  const updated = await findRegisteredMember(db, discordUserId);
  if (!updated) {
    throw new AccessPolicyError("registeredMember.update", "not_found");
  }

  return updated;
}

async function checkD1TransactionLimitation(db: Db): Promise<ExpectedError> {
  const transaction = (db as TransactionCapableDb).transaction;
  if (typeof transaction !== "function") {
    return {
      matched: true,
      error: {
        category: "unsupported_feature",
        message: "Drizzle D1 database does not expose an interactive transaction method",
      },
    };
  }

  return expectError(() => Promise.resolve(transaction.call(db, async () => undefined)), isTransactionUnsupported);
}

async function runSpike(env: Env): Promise<SpikeSummary> {
  const checks: CheckResult[] = [];
  const db = makeClient(env);

  await reset(db);
  await seed(db);

  const relationRead = await db.query.registeredMembers.findFirst({
    where: (registeredMembers, { eq: relationEq }) => relationEq(registeredMembers.discordUserId, "900"),
    with: { discordUser: true, assignedOwner: { with: { connection: true } } },
  });
  checks.push({
    category: "compatible",
    name: "relation-aware read includes discord user, owner, and connection",
    ok: relationRead?.discordUser?.username === "member-a" && relationRead?.assignedOwner?.connection?.status === "active",
    detail: relationRead,
  });

  const adminOwner: AuthOwner = { discordUserId: "100", role: "admin", status: "active" };
  const regularAOwner: AuthOwner = { discordUserId: "200", role: "regular", status: "active" };
  const disabledRegularOwner: AuthOwner = { discordUserId: "300", role: "regular", status: "disabled" };

  const adminMembers = await readRegisteredMembersForOwner(db, adminOwner);
  checks.push({
    category: "compatible",
    name: "policy admin can read all members",
    ok: adminMembers.length === 2,
    detail: adminMembers,
  });

  const regularMembers = await readRegisteredMembersForOwner(db, regularAOwner);
  checks.push({
    category: "compatible",
    name: "policy regular owner reads only assigned members",
    ok: regularMembers.length === 1 && regularMembers[0]?.discordUserId === "900",
    detail: regularMembers,
  });

  const disabledMembers = await readRegisteredMembersForOwner(db, disabledRegularOwner);
  checks.push({
    category: "compatible",
    name: "policy disabled owner cannot read members",
    ok: disabledMembers.length === 0,
    detail: disabledMembers,
  });

  const regularCreatedMember = await createRegisteredMember(db, regularAOwner, {
    discordUserId: "902",
    assignedOwnerDiscordUserId: "200",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  });
  checks.push({
    category: "compatible",
    name: "policy regular active owner can create assigned member",
    ok: regularCreatedMember.discordUserId === "902" && regularCreatedMember.assignedOwnerDiscordUserId === "200",
    detail: regularCreatedMember,
  });

  const adminCreatedMember = await createRegisteredMember(db, adminOwner, {
    discordUserId: "903",
    assignedOwnerDiscordUserId: "100",
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  });
  checks.push({
    category: "compatible",
    name: "policy admin can create registered member",
    ok: adminCreatedMember.discordUserId === "903" && adminCreatedMember.assignedOwnerDiscordUserId === "100",
    detail: adminCreatedMember,
  });

  const regularUpdatedMember = await updateRegisteredMember(db, regularAOwner, "900", { updatedAt: now() });
  checks.push({
    category: "compatible",
    name: "policy regular active owner can update without changing assigned owner",
    ok: regularUpdatedMember.discordUserId === "900" && regularUpdatedMember.assignedOwnerDiscordUserId === "200",
    detail: regularUpdatedMember,
  });

  const regularReassignAttempt = await expectError(
    () => updateRegisteredMember(db, regularAOwner, "900", { assignedOwnerDiscordUserId: "100", updatedAt: now() }),
    isAccessDenied,
  );
  checks.push({
    category: "compatible",
    name: "policy regular active owner cannot change assigned owner",
    ok: regularReassignAttempt.matched,
    detail: regularReassignAttempt,
  });

  const adminUpdatedMember = await updateRegisteredMember(db, adminOwner, "901", {
    assignedOwnerDiscordUserId: "200",
    updatedAt: now(),
  });
  checks.push({
    category: "compatible",
    name: "policy admin can update registered member",
    ok: adminUpdatedMember.discordUserId === "901" && adminUpdatedMember.assignedOwnerDiscordUserId === "200",
    detail: adminUpdatedMember,
  });

  const transactionAttempt = await checkD1TransactionLimitation(db);
  checks.push({
    category: "limitation",
    name: "interactive transaction is unavailable for Drizzle D1 client",
    ok: transactionAttempt.matched,
    detail: transactionAttempt,
  });

  const registeredMemberCount = await db.select({ value: count() }).from(schema.registeredMembers).get();
  checks.push({
    category: "compatible",
    name: "Drizzle aggregate count can query D1 through same client",
    ok: Number(registeredMemberCount?.value ?? 0) === 4,
    detail: registeredMemberCount,
  });

  const compatibleChecks = checks.filter((check) => check.category === "compatible");
  const limitationChecks = checks.filter((check) => check.category === "limitation");

  return {
    ok: compatibleChecks.every((check) => check.ok) && limitationChecks.every((check) => check.ok),
    compatible: compatibleChecks.every((check) => check.ok),
    limitationsConfirmed: limitationChecks.every((check) => check.ok),
    checks,
  };
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/spike/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/spike/run") {
      try {
        const result = await runSpike(env);
        return json(result, result.ok ? 200 : 500);
      } catch (error) {
        return json(
          {
            ok: false,
            error: toSafeResponseError(error),
          },
          500,
        );
      }
    }

    return json({ ok: false, error: "Not found" }, 404);
  },
};
