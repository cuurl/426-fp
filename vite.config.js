import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
    supported: {
        "top-level-await": true, //browsers can handle top-level-await features
    },
    plugins: [
        topLevelAwait({
          // The export name of top-level await promise for each chunk module
          promiseExportName: "__tla",
          // The function to generate import names of top-level await promise in each chunk module
          promiseImportName: i => `__tla_${i}`
        })
      ],
    base: "/426-fp/",
});
