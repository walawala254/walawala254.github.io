const pageFlow = [
  "index.html",
  "about.html",
  "services.html",
  "portfolio.html",
  "contact.html"
];

export function initPageFlow() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const currentPageIndex = pageFlow.indexOf(currentPage);

  if (currentPageIndex === -1) return;

  let wheelIntent = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartedAtEdge = false;
  let lastPageTurn = 0;

  const isNavigationOpen = () => document.body.classList.contains("nav-open");
  const isAtTop = () => window.scrollY <= 4;
  const isAtBottom = () =>
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 4;
  const canTurnPage = () =>
    !isNavigationOpen() && Date.now() - lastPageTurn > 900;

  const goToPage = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= pageFlow.length) return;

    lastPageTurn = Date.now();
    window.location.href = pageFlow[nextIndex];
  };

  window.addEventListener(
    "wheel",
    (event) => {
      if (!canTurnPage()) return;

      const scrollingDown = event.deltaY > 0;
      const scrollingUp = event.deltaY < 0;
      const canGoNext =
        scrollingDown &&
        isAtBottom() &&
        currentPageIndex < pageFlow.length - 1;
      const canGoPrevious =
        scrollingUp && isAtTop() && currentPageIndex > 0;

      if (!canGoNext && !canGoPrevious) {
        wheelIntent = 0;
        return;
      }

      wheelIntent += Math.abs(event.deltaY);

      if (wheelIntent < 240) return;
      goToPage(currentPageIndex + (canGoNext ? 1 : -1));
    },
    { passive: true }
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      if (!canTurnPage() || event.touches.length !== 1) return;

      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchStartedAtEdge = isAtTop() || isAtBottom();
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (event) => {
      if (
        !canTurnPage() ||
        !touchStartedAtEdge ||
        event.changedTouches.length !== 1
      ) {
        return;
      }

      const deltaX = touchStartX - event.changedTouches[0].clientX;
      const deltaY = touchStartY - event.changedTouches[0].clientY;
      const mostlyVertical = Math.abs(deltaY) > Math.abs(deltaX) * 1.5;
      const intentionalSwipe = Math.abs(deltaY) > 90;

      if (!mostlyVertical || !intentionalSwipe) return;
      if (deltaY > 0 && isAtBottom()) goToPage(currentPageIndex + 1);
      if (deltaY < 0 && isAtTop()) goToPage(currentPageIndex - 1);
    },
    { passive: true }
  );
}
