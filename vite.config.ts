import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
import solidPlugin from "vite-plugin-solid"
import path from "path"

export default defineConfig({ 
    plugins: [
        solidPlugin(),
        tailwindcss(),
    ],
    build: {
        target: 'esnext',
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@/components": path.resolve(__dirname, "./src/components"),
            "@/assets": path.resolve(__dirname, "./src/assets"),
            "@/db": path.resolve(__dirname, "./src/db"),
            "@/import": path.resolve(__dirname, "./src/import"),
            "@/pages": path.resolve(__dirname, "./src/pages"),
            "@/types": path.resolve(__dirname, "./src/types"),
            "@/utils": path.resolve(__dirname, "./src/utils"),
        }
    }
})