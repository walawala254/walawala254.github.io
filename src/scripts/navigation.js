const desktopNavigationQuery = window.matchMedia("(min-width: 1025px)");

export function initNavigation() {
  const navToggle = document.querySelector(".nav-toggle");
  const navPanel = document.querySelector(".nav-panel");

  if (!navToggle || !navPanel) return;

  const firstMenuLink = navPanel.querySelector("a");
  const isOpen = () => navToggle.getAttribute("aria-expanded") === "true";

  const closeNavigation = ({ returnFocus = false } = {}) => {
    if (!isOpen()) return;

    navToggle.setAttribute("aria-expanded", "false");
    navPanel.classList.remove("is-open");
    document.body.classList.remove("nav-open");

    if (returnFocus) {
      navToggle.focus({ preventScroll: true });
    }
  };

  const openNavigation = () => {
    navToggle.setAttribute("aria-expanded", "true");
    navPanel.classList.add("is-open");
    document.body.classList.add("nav-open");
    firstMenuLink?.focus({ preventScroll: true });
  };

  navToggle.addEventListener("click", () => {
    if (isOpen()) {
      closeNavigation({ returnFocus: true });
    } else {
      openNavigation();
    }
  });

  navPanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeNavigation());
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      closeNavigation({ returnFocus: true });
    }
  });

  document.addEventListener("click", (event) => {
    const clickedInsideNavigation =
      navPanel.contains(event.target) || navToggle.contains(event.target);

    if (isOpen() && !clickedInsideNavigation) {
      closeNavigation();
    }
  });

  desktopNavigationQuery.addEventListener("change", (event) => {
    if (event.matches) closeNavigation();
  });
}
