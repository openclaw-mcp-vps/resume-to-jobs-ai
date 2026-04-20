import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import type {
  AccessTokenRecord,
  PitchEmailModel,
  SearchResultRecord
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const ACCESS_FILE = path.join(DATA_DIR, "access-tokens.json");
const SEARCH_RESULTS_FILE = path.join(DATA_DIR, "search-results.json");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false
    })
  : null;

let schemaReady = false;

async function ensureSchema() {
  if (!pool || schemaReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS access_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_results (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  schemaReady = true;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await ensureDataDir();
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export async function saveAccessToken(
  input: Omit<AccessTokenRecord, "createdAt"> & { createdAt?: string }
): Promise<void> {
  const record: AccessTokenRecord = {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString()
  };

  if (pool) {
    await ensureSchema();
    await pool.query(
      `
      INSERT INTO access_tokens (token, email, order_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (token)
      DO UPDATE SET
        email = EXCLUDED.email,
        order_id = EXCLUDED.order_id,
        status = EXCLUDED.status
    `,
      [record.token, record.email, record.orderId, record.status, record.createdAt]
    );
    return;
  }

  const entries = await readJson<AccessTokenRecord[]>(ACCESS_FILE, []);
  const existingIndex = entries.findIndex((entry) => entry.token === record.token);

  if (existingIndex >= 0) {
    entries[existingIndex] = record;
  } else {
    entries.push(record);
  }

  await writeJson(ACCESS_FILE, entries);
}

export async function getAccessToken(token: string): Promise<AccessTokenRecord | null> {
  if (!token) {
    return null;
  }

  if (pool) {
    await ensureSchema();
    const result = await pool.query<{
      token: string;
      email: string;
      order_id: string;
      status: string;
      created_at: Date;
    }>(
      `SELECT token, email, order_id, status, created_at FROM access_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      token: row.token,
      email: row.email,
      orderId: row.order_id,
      status: row.status === "paid" ? "paid" : "pending",
      createdAt: row.created_at.toISOString()
    };
  }

  const entries = await readJson<AccessTokenRecord[]>(ACCESS_FILE, []);
  return entries.find((entry) => entry.token === token) ?? null;
}

export async function isAccessTokenPaid(token: string): Promise<boolean> {
  const record = await getAccessToken(token);
  return Boolean(record && record.status === "paid");
}

export async function createSearchResult(
  input: Omit<SearchResultRecord, "id" | "createdAt" | "pitches">
): Promise<SearchResultRecord> {
  const record: SearchResultRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    pitches: [],
    ...input
  };

  await saveSearchResult(record);
  return record;
}

export async function saveSearchResult(record: SearchResultRecord): Promise<void> {
  if (pool) {
    await ensureSchema();
    await pool.query(
      `
      INSERT INTO search_results (id, data, created_at)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data
    `,
      [record.id, JSON.stringify(record), record.createdAt]
    );
    return;
  }

  const records = await readJson<SearchResultRecord[]>(SEARCH_RESULTS_FILE, []);
  const index = records.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  await writeJson(SEARCH_RESULTS_FILE, records);
}

export async function getSearchResult(
  id: string
): Promise<SearchResultRecord | null> {
  if (!id) {
    return null;
  }

  if (pool) {
    await ensureSchema();
    const result = await pool.query<{ data: SearchResultRecord }>(
      `SELECT data FROM search_results WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0]?.data ?? null;
  }

  const records = await readJson<SearchResultRecord[]>(SEARCH_RESULTS_FILE, []);
  return records.find((entry) => entry.id === id) ?? null;
}

export async function updateSearchResultPitches(
  id: string,
  pitches: PitchEmailModel[]
): Promise<SearchResultRecord | null> {
  const existing = await getSearchResult(id);
  if (!existing) {
    return null;
  }

  const updated: SearchResultRecord = {
    ...existing,
    pitches
  };

  await saveSearchResult(updated);
  return updated;
}
