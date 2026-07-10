document.documentElement.classList.add("js");

const navToggle = document.querySelector(".nav-toggle");
const navPanel = document.querySelector(".nav-panel");
const closeNav = () => {
    if (!navToggle || !navPanel) return;
    navToggle.setAttribute("aria-expanded", "false");
    navPanel.classList.remove("is-open");
    document.body.classList.remove("nav-open");
};

if (navToggle && navPanel) {
    navToggle.addEventListener("click", () => {
        const isOpen = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!isOpen));
        navPanel.classList.toggle("is-open", !isOpen);
        document.body.classList.toggle("nav-open", !isOpen);
    });

    navPanel.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeNav();
    });

    document.addEventListener("click", (event) => {
        const isOpen = navToggle.getAttribute("aria-expanded") === "true";
        const clickedInsideNav = navPanel.contains(event.target) || navToggle.contains(event.target);
        if (isOpen && !clickedInsideNav) closeNav();
    });
}

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const delay = entry.target.getAttribute("data-delay") || 0;
                entry.target.style.transitionDelay = `${delay}ms`;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => observer.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}
