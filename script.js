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

const pageFlow = ["index.html", "about.html", "services.html", "portfolio.html", "contact.html"];
const currentPage = window.location.pathname.split("/").pop() || "index.html";
const currentPageIndex = pageFlow.indexOf(currentPage);
let wheelIntent = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartedAtEdge = false;
let lastPageTurn = 0;

const isNavOpen = () => document.body.classList.contains("nav-open");
const isAtTop = () => window.scrollY <= 4;
const isAtBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
const canTurnPage = () => currentPageIndex !== -1 && !isNavOpen() && Date.now() - lastPageTurn > 900;
const goToPage = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= pageFlow.length) return;
    lastPageTurn = Date.now();
    window.location.href = pageFlow[nextIndex];
};

if (currentPageIndex !== -1) {
    window.addEventListener("wheel", (event) => {
        if (!canTurnPage()) return;

        const scrollingDown = event.deltaY > 0;
        const scrollingUp = event.deltaY < 0;
        const canGoNext = scrollingDown && isAtBottom() && currentPageIndex < pageFlow.length - 1;
        const canGoPrev = scrollingUp && isAtTop() && currentPageIndex > 0;

        if (!canGoNext && !canGoPrev) {
            wheelIntent = 0;
            return;
        }

        wheelIntent += Math.abs(event.deltaY);

        if (wheelIntent < 240) return;
        goToPage(currentPageIndex + (canGoNext ? 1 : -1));
    }, { passive: true });

    window.addEventListener("touchstart", (event) => {
        if (!canTurnPage() || event.touches.length !== 1) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        touchStartedAtEdge = isAtTop() || isAtBottom();
    }, { passive: true });

    window.addEventListener("touchend", (event) => {
        if (!canTurnPage() || !touchStartedAtEdge || event.changedTouches.length !== 1) return;

        const deltaX = touchStartX - event.changedTouches[0].clientX;
        const deltaY = touchStartY - event.changedTouches[0].clientY;
        const mostlyVertical = Math.abs(deltaY) > Math.abs(deltaX) * 1.5;
        const intentionalSwipe = Math.abs(deltaY) > 90;

        if (!mostlyVertical || !intentionalSwipe) return;
        if (deltaY > 0 && isAtBottom()) goToPage(currentPageIndex + 1);
        if (deltaY < 0 && isAtTop()) goToPage(currentPageIndex - 1);
    }, { passive: true });
}
