import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/gis/",
  server: {
    // The parent CarboNex app owns 5173 and proxies /gis here, so this app must
    // not claim the same port. Bind IPv4 explicitly: the proxy target is
    // 127.0.0.1, which cannot reach a server that bound to [::1] only.
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
});
