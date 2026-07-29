import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const page = (fileName) => fileURLToPath(new URL(fileName, import.meta.url));

export default defineConfig({
  appType: "mpa",
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        home: page("index.html"),
        about: page("about.html"),
        services: page("services.html"),
        portfolio: page("portfolio.html"),
        contact: page("contact.html"),
        notFound: page("404.html")
      }
    }
  },
  root: projectRoot
});
