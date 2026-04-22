import "server-only";

interface DatabaseConfig {
  database: string;
  host: string;
  password: string;
  port: number;
  user: string;
}

const REQUIRED_DATABASE_ENV_KEYS = [
  "DB_NAME",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
] as const;

const DATABASE_CONFIG_HELP =
  "Set these values in merrimack-museum/.env.local or the process environment.";

let cachedDatabaseConfig: DatabaseConfig | null = null;

function readDatabaseEnvValue(key: string) {
  return process.env[key]?.trim();
}

function getMissingDatabaseEnvKeys() {
  return REQUIRED_DATABASE_ENV_KEYS.filter((key) => !readDatabaseEnvValue(key));
}

function parseDatabasePort(value: string) {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`[db/config] Invalid DB_PORT value '${value}'. Use a positive integer.`);
  }

  return port;
}
function createDatabaseConfig() {
  const missingKeys = getMissingDatabaseEnvKeys();

  if (missingKeys.length > 0) {
    throw new Error(
      `[db/config] Missing required database configuration: ${missingKeys.join(", ")}. ${DATABASE_CONFIG_HELP}`,
    );
  }

  return {
    database: readDatabaseEnvValue("DB_NAME")!,
    host: readDatabaseEnvValue("DB_HOST")!,
    password: readDatabaseEnvValue("DB_PASSWORD") ?? "",
    port: parseDatabasePort(readDatabaseEnvValue("DB_PORT")!),
    user: readDatabaseEnvValue("DB_USER")!,
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  if (!cachedDatabaseConfig) {
    cachedDatabaseConfig = createDatabaseConfig();
  }

  return cachedDatabaseConfig;
}
