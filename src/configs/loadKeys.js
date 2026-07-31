import fs from "fs";

import path from "path";

export const PRIVATE_KEY = fs.readFileSync(
  path.join(process.cwd(), "keys/private.pem"),
  "utf8",
);

export const PUBLIC_KEY = fs.readFileSync(
  path.join(process.cwd(), "keys/public.pem"),
  "utf8",
);
