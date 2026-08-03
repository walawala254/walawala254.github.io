export function initCaseNavigation() {
  const sectionNavigation = document.querySelector("[data-section-navigation]");
  if (!sectionNavigation) return;

  const links = [...sectionNavigation.querySelectorAll('a[href^="#"]')];
  const getHashTarget = (hash) => {
    if (!hash?.startsWith("#")) return null;

    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  };
  const sections = links
    .map((link) => getHashTarget(link.hash))
    .filter(Boolean);
  let observer;

  const setCurrentSection = (id) => {
    links.forEach((link) => {
      if (link.hash === `#${id}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    window.__CASE_NAV_DIAGNOSTICS__ = {
      activeSection: id,
      observing: Boolean(observer)
    };
  };

  const currentSectionFromViewport = () => {
    const marker = Math.min(window.innerHeight * 0.3, 260);
    return sections.reduce((current, section) => {
      if (section.getBoundingClientRect().top <= marker) return section;
      return current;
    }, sections[0]);
  };

  const disconnect = () => {
    observer?.disconnect();
    observer = undefined;
    window.__CASE_NAV_DIAGNOSTICS__ = {
      activeSection:
        sectionNavigation.querySelector('[aria-current="location"]')?.hash.slice(1) ||
        null,
      observing: false
    };
  };

  const observe = () => {
    disconnect();

    if (!("IntersectionObserver" in window) || !sections.length) return;

    observer = new IntersectionObserver(
      (entries) => {
        const marker = Math.min(window.innerHeight * 0.3, 260);
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - marker) -
              Math.abs(b.boundingClientRect.top - marker)
          );
        if (visible[0]) setCurrentSection(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -68%", threshold: [0, 0.1] }
    );

    sections.forEach((section) => observer.observe(section));
    const hashTarget = getHashTarget(location.hash);
    setCurrentSection(
      hashTarget?.id ||
        currentSectionFromViewport()?.id ||
        sections[0].id
    );
  };

  links.forEach((link) => {
    link.addEventListener("click", () => setCurrentSection(link.hash.slice(1)));
  });
  window.addEventListener("hashchange", () => {
    const target = getHashTarget(location.hash);
    if (target) setCurrentSection(target.id);
  });
  window.addEventListener("pagehide", disconnect);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) observe();
  });

  observe();
}
