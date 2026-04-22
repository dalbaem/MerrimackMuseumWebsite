import "server-only";

import { createPool } from "mysql2";
import { Kysely, MysqlDialect, type Transaction } from "kysely";
import { getDatabaseConfig } from "@/server/db/config";
import type { MuseumDatabase } from "@/server/db/legacy/schema";

declare global {
  var museumDb: Kysely<MuseumDatabase> | undefined;
}

type DatabaseClient = Kysely<MuseumDatabase>;

function createDatabaseClient() {
  const config = getDatabaseConfig();
  const pool = createPool({
    database: config.database,
    host: config.host,
    password: config.password,
    port: config.port,
    user: config.user,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    decimalNumbers: false,
  });

  return new Kysely<MuseumDatabase>({
    dialect: new MysqlDialect({ pool }),
  });
}

function getDatabaseClient(): DatabaseClient {
  if (!globalThis.museumDb) {
    globalThis.museumDb = createDatabaseClient();
  }

  return globalThis.museumDb;
}

export type DatabaseExecutor =
  | Kysely<MuseumDatabase>
  | Transaction<MuseumDatabase>;

export const db = new Proxy({} as DatabaseClient, {
  get(_target, property, receiver) {
    const client = getDatabaseClient();
    const value = Reflect.get(client as object, property, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
}) as DatabaseClient;
