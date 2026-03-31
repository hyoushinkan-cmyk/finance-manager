import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // 避免与上级目录的 package-lock 冲突时被误判为 monorepo 根目录
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
