// Generates public/logo-email.png from public/logo.svg at build time.
//
// Why not commit the PNG? Binary files can't be pushed through the GitHub
// MCP text tools (bytes get mangled), and email clients don't render SVG —
// so we rasterize during `npm run build` via the `prebuild` npm hook instead.
import sharp from "sharp";
import { existsSync } from "node:fs";

try {
  if (!existsSync("public/logo.svg")) {
    console.warn("[prebuild] public/logo.svg missing — skipping email logo");
  } else {
    await sharp("public/logo.svg", { density: 150 })
      .resize({ width: 400 })
      .png()
      .toFile("public/logo-email.png");
    console.log("[prebuild] public/logo-email.png generated");
  }
} catch (err) {
  // Never fail the build over a logo — the email template has alt text.
  console.warn("[prebuild] email logo generation failed:", err?.message || err);
}
