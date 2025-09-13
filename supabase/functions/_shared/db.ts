/// <reference lib="deno.ns" />
// supabase/functions/_shared/db.ts
import { Kysely, PostgresDialect } from "npm:kysely";
import { Pool } from "npm:pg";
import type { DB as Database } from "./database.types.ts";

const dialect = new PostgresDialect({
  pool: new Pool({ 
    connectionString: Deno.env.get('SUPABASE_DB_URL') || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  }),
});

export const db = new Kysely<Database>({ dialect });