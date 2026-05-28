import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "firecrawl");

async function ensureDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
}

export interface Snapshot<T> {
  savedAt: number;
  data:    T;
}

export async function loadSnapshot<T>(key: string): Promise<Snapshot<T> | null> {
  try {
    await ensureDir();
    const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw) as Snapshot<T>;
  } catch {
    return null;
  }
}

export async function saveSnapshot<T>(key: string, data: T): Promise<void> {
  try {
    await ensureDir();
    const payload: Snapshot<T> = { savedAt: Date.now(), data };
    await fs.writeFile(
      path.join(DATA_DIR, `${key}.json`),
      JSON.stringify(payload),
      "utf8",
    );
  } catch {}
}
