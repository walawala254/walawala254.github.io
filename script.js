import { initNavigation } from "./src/scripts/navigation.js";
import { initReveals } from "./src/scripts/reveal.js";
import { initCaseNavigation } from "./src/scripts/case-navigation.js";

document.documentElement.classList.add("js");

initNavigation();
initReveals();
initCaseNavigation();
