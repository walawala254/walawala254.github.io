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
        caseTransactionMonitoring: page(
          "case-studies/transaction-monitoring/index.html"
        ),
        notFound: page("404.html"),
        prototypeLab: page("prototypes/index.html"),
        prototypeSvg: page("prototypes/svg-css.html"),
        prototypeCanvas: page("prototypes/canvas-2d.html"),
        prototypeThree: page("prototypes/three-js.html")
      }
    }
  },
  root: projectRoot
});
