import { initNavigation } from "./src/scripts/navigation.js";
import { initPageFlow } from "./src/scripts/page-flow.js";
import { initReveals } from "./src/scripts/reveal.js";

document.documentElement.classList.add("js");

initNavigation();
initReveals();

if (document.body.dataset.pageFlow !== "disabled") {
  initPageFlow();
}
