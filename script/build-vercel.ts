import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, mkdir, writeFile } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("Building client with Vite...");
  await viteBuild();

  console.log("Building API serverless function...");
  await mkdir("dist/api", { recursive: true });

  await esbuild({
    entryPoints: ["api/index.ts"],
    platform: "node",
    target: "node18",
    bundle: true,
    format: "cjs",
    outfile: "dist/api/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    // Bundle everything into a single file
    external: [],
    logLevel: "info",
  });

  // Create a package.json for the API function to ensure CJS
  await writeFile(
    "dist/api/package.json",
    JSON.stringify({ type: "commonjs" })
  );

  console.log("Build complete!");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
