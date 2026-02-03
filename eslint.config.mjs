import next from "eslint-config-next";

// Use the flat config that Next.js 16 exposes to avoid legacy compat/circular plugin issues.
const config = [...next];

export default config;
