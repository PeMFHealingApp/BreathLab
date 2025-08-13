import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use a different base path when serving locally vs. building for GitHub Pages.
// The dev server runs at the root URL, while production builds are served
// from the /BreathLab/ subdirectory on GitHub Pages.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/BreathLab/" : "/",
  plugins: [react()],
}));
