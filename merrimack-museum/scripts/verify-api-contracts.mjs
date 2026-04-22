import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const checks = [
  {
    file: "app/api/artworks/route.ts",
    forbidden: [
      "idartwork:",
      "date_created_month:",
      "date_created_year:",
      "artist_name",
      "donor_name",
      "image_path",
    ],
  },
  {
    file: "app/api/artworks/[id]/route.ts",
    forbidden: [
      "idartwork:",
      "date_created_month:",
      "date_created_year:",
      "artist_name",
      "donor_name",
      "image_path",
    ],
  },
  {
    file: "app/api/moverequests/route.ts",
    forbidden: [
      "to_location:",
      "is_pending:",
      "is_approved:",
      "is_complete:",
      "request_notes:",
      "request_type:",
      "time_stamp:",
    ],
  },
  {
    file: "app/api/moverequests/[id]/route.ts",
    forbidden: [
      "to_location:",
      "is_pending:",
      "is_approved:",
      "is_complete:",
      "request_notes:",
      "request_type:",
      "time_stamp:",
    ],
  },
  {
    file: "app/api/moverequests/[id]/approval/route.ts",
    forbidden: [
      "to_location:",
      "is_pending:",
      "is_approved:",
      "is_complete:",
      "request_notes:",
      "request_type:",
      "time_stamp:",
    ],
  },
  {
    file: "app/api/moverequests/[id]/completion/route.ts",
    forbidden: [
      "to_location:",
      "is_pending:",
      "is_approved:",
      "is_complete:",
      "request_notes:",
      "request_type:",
      "time_stamp:",
    ],
  },
  {
    file: "app/api/user/route.ts",
    forbidden: [
      "address:",
      "user_type:",
    ],
  },
  {
    file: "app/api/users/role/route.ts",
    forbidden: [
      "address:",
      "user_type:",
    ],
  },
  {
    file: "app/api/images/route.ts",
    forbidden: ["image_path"],
  },
];

const failures = [];

for (const check of checks) {
  const filePath = path.join(rootDir, check.file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Verification target is missing: ${check.file}`);
    continue;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  for (const snippet of check.forbidden) {
    if (contents.includes(snippet)) {
      failures.push(`${check.file} still contains legacy response key snippet: ${snippet}`);
    }
  }
}

if (failures.length > 0) {
  console.error("API contract verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("API contract verification passed.");
