import { defineConfig } from "vite";
import { resolve } from 'path'
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
    assetsInclude: ["**/*.fbx", "**/*.glb", "**/*.ogg", "**/*.ttf", "**/*.mp3"],
    supported: {
        "top-level-await": true, //browsers can handle top-level-await features
    },
    plugins: [
        topLevelAwait({
            // The export name of top-level await promise for each chunk module
            promiseExportName: "__tla",
            // The function to generate import names of top-level await promise in each chunk module
            promiseImportName: (i) => `__tla_${i}`,
        }),
    ],
    base: "/426-fp/",
    build: {
        rollupOptions: {
            input: {
                index: "./index.html",
                death: "./death.html",
            },
            output: {
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                assetFileNames: `assets/[name].[ext]`,
            },
        },
    },
});
