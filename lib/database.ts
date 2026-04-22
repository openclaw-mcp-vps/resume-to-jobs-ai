import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type PurchaseRecord = {
  email: string;
  sessionId?: string;
  customerId?: string;
  purchasedAt: string;
  lastPaidAt: string;
  accessExpiresAt: string;
};

type PurchaseRecordInput = {
  email: string;
  sessionId?: string;
  customerId?: string;
  purchasedAt?: string;
};

const DATABASE_FILE_PATH = path.join(process.cwd(), "data", "purchases.json");

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureDatabaseFile() {
  await mkdir(path.dirname(DATABASE_FILE_PATH), { recursive: true });

  try {
    await readFile(DATABASE_FILE_PATH, "utf8");
  } catch {
    await writeFile(DATABASE_FILE_PATH, "[]", "utf8");
  }
}

async function readDatabase(): Promise<PurchaseRecord[]> {
  await ensureDatabaseFile();

  const raw = await readFile(DATABASE_FILE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => typeof entry?.email === "string")
      .map((entry) => ({
        email: normalizeEmail(String(entry.email)),
        sessionId: entry.sessionId ? String(entry.sessionId) : undefined,
        customerId: entry.customerId ? String(entry.customerId) : undefined,
        purchasedAt: String(entry.purchasedAt ?? new Date().toISOString()),
        lastPaidAt: String(entry.lastPaidAt ?? entry.purchasedAt ?? new Date().toISOString()),
        accessExpiresAt: String(entry.accessExpiresAt ?? new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()),
      }));
  } catch {
    return [];
  }
}

async function writeDatabase(records: PurchaseRecord[]) {
  await ensureDatabaseFile();

  const tmpPath = `${DATABASE_FILE_PATH}.tmp`;
  const payload = JSON.stringify(records, null, 2);
  await writeFile(tmpPath, payload, "utf8");
  await rename(tmpPath, DATABASE_FILE_PATH);
}

function computeAccessExpiry(baseIso?: string) {
  const baseDate = baseIso ? new Date(baseIso) : new Date();
  const expiry = new Date(baseDate.getTime() + 31 * 24 * 60 * 60 * 1000);
  return expiry.toISOString();
}

export async function upsertPurchaseRecord(input: PurchaseRecordInput) {
  const email = normalizeEmail(input.email);
  const purchasedAt = input.purchasedAt ?? new Date().toISOString();

  const records = await readDatabase();
  const existing = records.find((record) => record.email === email);

  if (existing) {
    existing.sessionId = input.sessionId ?? existing.sessionId;
    existing.customerId = input.customerId ?? existing.customerId;
    existing.lastPaidAt = purchasedAt;
    existing.accessExpiresAt = computeAccessExpiry(purchasedAt);
  } else {
    records.push({
      email,
      sessionId: input.sessionId,
      customerId: input.customerId,
      purchasedAt,
      lastPaidAt: purchasedAt,
      accessExpiresAt: computeAccessExpiry(purchasedAt),
    });
  }

  await writeDatabase(records);
}

export async function hasActivePurchase(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const records = await readDatabase();

  const record = records.find((entry) => entry.email === normalizedEmail);
  if (!record) {
    return false;
  }

  return new Date(record.accessExpiresAt).getTime() > Date.now();
}

export async function getPurchaseRecord(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const records = await readDatabase();
  return records.find((entry) => entry.email === normalizedEmail) ?? null;
}
