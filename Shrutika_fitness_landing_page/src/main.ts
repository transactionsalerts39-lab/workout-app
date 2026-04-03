import "./styles.css";

type Goal = "lose-weight" | "maintain" | "build-muscle";
type Sex = "female" | "male";

interface CalcInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: number;
  goal: Goal;
}

interface CalcOutput {
  maintenanceKcal: number;
  goalKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

interface SiteLinks {
  bookCallUrl: string;
  instagramUrl: string;
  googleFormAction: string;
  googleFormFieldMap: Record<string, string>;
}

interface LeadFormInput {
  fullName: string;
  email: string;
  instagramHandle?: string;
  primaryGoal: string;
  selectedPlan: "beginner" | "intermediate" | "advanced";
  message?: string;
}

type CoreSectionId =
  | "plans"
  | "why"
  | "process"
  | "transformations"
  | "calculator"
  | "choose-plan";

interface MobileActionItem {
  id: string;
  label: string;
  href: string;
  external?: boolean;
}

interface MobileNavConfig {
  tabSections: CoreSectionId[];
  actionItems: MobileActionItem[];
}

const SITE_LINKS: SiteLinks = {
  bookCallUrl: "https://calendly.com/your-booking-link",
  instagramUrl: "https://instagram.com/yourhandle",
  googleFormAction: "https://docs.google.com/forms/d/e/REPLACE_FORM_ID/formResponse",
  googleFormFieldMap: {
    fullName: "entry.1111111111",
    email: "entry.2222222222",
    instagramHandle: "entry.3333333333",
    primaryGoal: "entry.4444444444",
    selectedPlan: "entry.5555555555",
    message: "entry.6666666666"
  }
};

const isPlaceholderGoogleForm = SITE_LINKS.googleFormAction.includes("REPLACE_FORM_ID");
const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileBreakpoint = window.matchMedia("(max-width: 820px)");
const MOBILE_NAV_CONFIG: MobileNavConfig = {
  tabSections: ["plans", "why", "process", "transformations", "calculator", "choose-plan"],
  actionItems: [
    { id: "book", label: "Book a Call", href: "#book-call" },
    { id: "choose", label: "Choose Plan", href: "#choose-plan" },
    { id: "calculator", label: "DIY Calculator", href: "#calculator" },
    { id: "insta", label: "DM on Insta", href: "#choose-plan", external: true }
  ]
};

let closeMobileMenuPanel: () => void = () => {};
let closeMobileActionSheet: () => void = () => {};

const toNumber = (value: FormDataEntryValue | null): number => Number(value ?? 0);

const formatKcal = (value: number): string => `${Math.round(value)} kcal`;
const formatGram = (value: number): string => `${Math.round(value)} g`;

function isMobileView(): boolean {
  return mobileBreakpoint.matches;
}

function closeMobileOverlays(): void {
  closeMobileMenuPanel();
  closeMobileActionSheet();
}

function getGoalFactor(goal: Goal): number {
  if (goal === "lose-weight") return 0.85;
  if (goal === "build-muscle") return 1.1;
  return 1;
}

function calculateTargets(input: CalcInput): CalcOutput {
  const sexFactor = input.sex === "male" ? 5 : -161;
  const bmr = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexFactor;
  const maintenanceKcal = bmr * input.activity;
  const goalKcal = maintenanceKcal * getGoalFactor(input.goal);

  const proteinG = input.weightKg * 1.8;
  const fatsG = (goalKcal * 0.27) / 9;
  const carbsG = Math.max((goalKcal - proteinG * 4 - fatsG * 9) / 4, 0);

  return {
    maintenanceKcal,
    goalKcal,
    proteinG,
    carbsG,
    fatsG
  };
}

function setExternalLinks(): void {
  const bookLinks = document.querySelectorAll<HTMLAnchorElement>("[data-book-call-url]");
  const instaLinks = document.querySelectorAll<HTMLAnchorElement>("[data-instagram-url]");

  bookLinks.forEach((link) => {
    const fallback = link.dataset.fallback ?? "#choose-plan";
    if (SITE_LINKS.bookCallUrl.includes("your-booking-link")) {
      link.href = fallback;
      return;
    }

    link.href = SITE_LINKS.bookCallUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
  });

  instaLinks.forEach((link) => {
    if (SITE_LINKS.instagramUrl.includes("yourhandle")) {
      link.href = "#choose-plan";
      return;
    }

    link.href = SITE_LINKS.instagramUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
  });
}

function setupSmoothAnchors(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  const headerOffset = (): number => (header ? header.offsetHeight + (isMobileView() ? 8 : 12) : 0);

  const scrollToAnchorTarget = (target: HTMLElement, behavior: ScrollBehavior): void => {
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset();
    window.scrollTo({ top, behavior });
  };

  const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');

  anchors.forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;

      event.preventDefault();
      closeMobileOverlays();
      scrollToAnchorTarget(target, isReducedMotion ? "auto" : "smooth");
    });
  });

  if (window.location.hash) {
    const initialTarget = document.querySelector<HTMLElement>(window.location.hash);
    if (initialTarget) {
      requestAnimationFrame(() => {
        scrollToAnchorTarget(initialTarget, "auto");
      });
    }
  }
}

function setupScrollReveal(): void {
  const revealElements = document.querySelectorAll<HTMLElement>("[data-reveal]");
  if (!revealElements.length) return;

  if (isReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        instance.unobserve(entry.target);
      });
    },
    {
      threshold: 0.2
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

function setupMobileMenu(): void {
  const menuToggle = document.getElementById("mobile-menu-toggle") as HTMLButtonElement | null;
  const menuPanel = document.getElementById("mobile-menu-panel") as HTMLDivElement | null;
  const menuLinks = document.querySelectorAll<HTMLAnchorElement>("[data-mobile-menu-link]");

  if (!menuToggle || !menuPanel) return;

  const closeMenu = (): void => {
    menuPanel.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = (): void => {
    closeMobileActionSheet();
    menuPanel.hidden = false;
    menuToggle.setAttribute("aria-expanded", "true");
  };

  closeMobileMenuPanel = closeMenu;

  menuToggle.addEventListener("click", () => {
    if (!isMobileView()) return;
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
      return;
    }
    openMenu();
  });

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const onViewportChange = (e: MediaQueryListEvent): void => {
    if (!e.matches) closeMenu();
  };

  if (mobileBreakpoint.addEventListener) {
    mobileBreakpoint.addEventListener("change", onViewportChange);
  } else {
    mobileBreakpoint.addListener(onViewportChange);
  }
}

function setupMobileActionSheet(): void {
  const startButton = document.getElementById("mobile-start-cta") as HTMLButtonElement | null;
  const sheet = document.getElementById("mobile-action-sheet") as HTMLElement | null;
  const backdrop = document.getElementById("mobile-sheet-backdrop") as HTMLDivElement | null;
  const closeButton = document.querySelector<HTMLButtonElement>("[data-mobile-sheet-close]");
  const actionLinks = document.querySelectorAll<HTMLAnchorElement>("[data-mobile-sheet-action]");

  if (!startButton || !sheet || !backdrop || !closeButton) return;

  let previousFocus: HTMLElement | null = null;

  const closeSheet = (): void => {
    sheet.hidden = true;
    backdrop.hidden = true;
    startButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-overlay-open");

    if (previousFocus && previousFocus.isConnected) {
      previousFocus.focus();
    }
  };

  const openSheet = (): void => {
    if (!isMobileView()) return;
    closeMobileMenuPanel();

    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheet.hidden = false;
    backdrop.hidden = false;
    startButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("mobile-overlay-open");

    const firstAction = sheet.querySelector<HTMLElement>("[data-mobile-sheet-action]");
    firstAction?.focus();
  };

  closeMobileActionSheet = closeSheet;

  startButton.addEventListener("click", () => {
    const isOpen = startButton.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeSheet();
      return;
    }
    openSheet();
  });

  backdrop.addEventListener("click", closeSheet);
  closeButton.addEventListener("click", closeSheet);

  actionLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeSheet();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSheet();
  });

  const onViewportChange = (e: MediaQueryListEvent): void => {
    if (!e.matches) closeSheet();
  };

  if (mobileBreakpoint.addEventListener) {
    mobileBreakpoint.addEventListener("change", onViewportChange);
  } else {
    mobileBreakpoint.addListener(onViewportChange);
  }
}

function setupMobileTabScrollSpy(): void {
  const tabbar = document.querySelector<HTMLElement>(".mobile-tabbar");
  const tabs = document.querySelectorAll<HTMLAnchorElement>("[data-core-tab]");
  if (!tabbar || !tabs.length) return;

  const sections = MOBILE_NAV_CONFIG.tabSections
    .map((sectionId) => document.getElementById(sectionId))
    .filter((section): section is HTMLElement => section instanceof HTMLElement);

  if (!sections.length) return;

  let currentActiveId: CoreSectionId | null = null;
  let tabHintDismissed = false;

  const dismissTabbarHint = (): void => {
    tabHintDismissed = true;
    tabbar.classList.remove("show-hint");
  };

  const syncTabbarHintState = (): void => {
    if (!isMobileView()) {
      tabbar.classList.remove("show-hint");
      return;
    }

    const canScroll = tabbar.scrollWidth - tabbar.clientWidth > 8;
    const shouldShowHint = canScroll && tabbar.scrollLeft < 18 && !tabHintDismissed;
    tabbar.classList.toggle("show-hint", shouldShowHint);
  };

  const setActiveTab = (activeId: CoreSectionId): void => {
    tabs.forEach((tab) => {
      const tabId = tab.dataset.coreTab as CoreSectionId | undefined;
      tab.classList.toggle("is-active", tabId === activeId);
      if (tabId === activeId) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });

    const activeTab = tabbar.querySelector<HTMLAnchorElement>(`[data-core-tab="${activeId}"]`);
    if (activeTab && currentActiveId !== activeId && isMobileView()) {
      activeTab.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: isReducedMotion ? "auto" : "smooth"
      });
    }

    currentActiveId = activeId;
  };

  const refreshActiveTab = (): void => {
    if (!isMobileView()) return;

    const header = document.querySelector<HTMLElement>(".site-header");
    const offsetTop = (header?.offsetHeight ?? 0) + 16;
    let currentId: CoreSectionId = MOBILE_NAV_CONFIG.tabSections[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    sections.forEach((section) => {
      const top = section.getBoundingClientRect().top - offsetTop;
      const eligible = top <= window.innerHeight * 0.55;
      if (!eligible) return;

      const distance = Math.abs(top);
      if (distance < bestDistance) {
        bestDistance = distance;
        currentId = section.id as CoreSectionId;
      }
    });

    setActiveTab(currentId);
  };

  refreshActiveTab();
  syncTabbarHintState();

  tabbar.addEventListener(
    "scroll",
    () => {
      if (tabbar.scrollLeft > 8) dismissTabbarHint();
      syncTabbarHintState();
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      refreshActiveTab();
      if (window.scrollY > 140) dismissTabbarHint();
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    refreshActiveTab();
    syncTabbarHintState();
  });

  requestAnimationFrame(syncTabbarHintState);
  window.setTimeout(dismissTabbarHint, 4000);

  const onViewportChange = (): void => {
    refreshActiveTab();
    syncTabbarHintState();
  };

  if (mobileBreakpoint.addEventListener) {
    mobileBreakpoint.addEventListener("change", onViewportChange);
  } else {
    mobileBreakpoint.addListener(onViewportChange);
  }
}

function setupMobileStartCtaVisibility(): void {
  const startButton = document.getElementById("mobile-start-cta") as HTMLButtonElement | null;
  if (!startButton) return;

  let lastScrollY = window.scrollY;

  const syncVisibility = (): void => {
    if (!isMobileView()) {
      startButton.classList.remove("is-hidden");
      lastScrollY = window.scrollY;
      return;
    }

    const currentY = window.scrollY;
    const isScrollingDown = currentY > lastScrollY + 8;
    const isDeepIntoPage = currentY > 220;
    const shouldHide = isScrollingDown && isDeepIntoPage;

    startButton.classList.toggle("is-hidden", shouldHide);

    if (currentY < 120) {
      startButton.classList.remove("is-hidden");
    }

    lastScrollY = currentY;
  };

  syncVisibility();
  window.addEventListener("scroll", syncVisibility, { passive: true });
  window.addEventListener("resize", syncVisibility);
}

function setupCalculator(): void {
  const form = document.getElementById("calc-form") as HTMLFormElement | null;
  const maintenanceEl = document.getElementById("maintenance-kcal");
  const goalEl = document.getElementById("goal-kcal");
  const proteinEl = document.getElementById("protein-g");
  const carbsEl = document.getElementById("carbs-g");
  const fatsEl = document.getElementById("fats-g");

  if (!form || !maintenanceEl || !goalEl || !proteinEl || !carbsEl || !fatsEl) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const input: CalcInput = {
      weightKg: toNumber(formData.get("weightKg")),
      heightCm: toNumber(formData.get("heightCm")),
      age: toNumber(formData.get("age")),
      sex: (formData.get("sex") as Sex) ?? "female",
      activity: toNumber(formData.get("activity")),
      goal: (formData.get("goal") as Goal) ?? "lose-weight"
    };

    if (!input.weightKg || !input.heightCm || !input.age || !input.activity) {
      return;
    }

    const output = calculateTargets(input);

    maintenanceEl.textContent = formatKcal(output.maintenanceKcal);
    goalEl.textContent = formatKcal(output.goalKcal);
    proteinEl.textContent = formatGram(output.proteinG);
    carbsEl.textContent = formatGram(output.carbsG);
    fatsEl.textContent = formatGram(output.fatsG);
  });
}

function setupPlanButtons(): void {
  const planSelect = document.getElementById("selected-plan") as HTMLSelectElement | null;
  const buttons = document.querySelectorAll<HTMLButtonElement>(".choose-plan-btn");
  const header = document.querySelector<HTMLElement>(".site-header");

  if (!planSelect || !buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedPlan = button.dataset.plan as LeadFormInput["selectedPlan"] | undefined;
      if (!selectedPlan) return;

      planSelect.value = selectedPlan;
      const chooseSection = document.getElementById("choose-plan");
      if (!chooseSection) return;

      const headerOffset = (header?.offsetHeight ?? 0) + (isMobileView() ? 8 : 12);
      const top = chooseSection.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({
        top,
        behavior: isReducedMotion ? "auto" : "smooth"
      });
    });
  });
}

function setFeedback(element: HTMLElement, message: string, state: "success" | "error"): void {
  element.textContent = message;
  element.classList.remove("success", "error");
  element.classList.add(state);
}

function setupLeadForm(): void {
  const form = document.getElementById("lead-form") as HTMLFormElement | null;
  const feedbackEl = document.getElementById("lead-feedback") as HTMLParagraphElement | null;

  if (!form || !feedbackEl) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedbackEl.textContent = "";
    feedbackEl.classList.remove("success", "error");

    const formData = new FormData(form);

    const leadInput: LeadFormInput = {
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      instagramHandle: String(formData.get("instagramHandle") ?? "").trim(),
      primaryGoal: String(formData.get("primaryGoal") ?? "").trim(),
      selectedPlan: (formData.get("selectedPlan") as LeadFormInput["selectedPlan"]) ?? "intermediate",
      message: String(formData.get("message") ?? "").trim()
    };

    if (!leadInput.fullName || !leadInput.email || !leadInput.primaryGoal || !leadInput.selectedPlan) {
      setFeedback(feedbackEl, "Please fill all required fields before submitting.", "error");
      return;
    }

    if (isPlaceholderGoogleForm) {
      setFeedback(
        feedbackEl,
        "Set your Google Form URL and entry IDs in src/main.ts before enabling submissions.",
        "error"
      );
      return;
    }

    const payload = new URLSearchParams();
    const map = SITE_LINKS.googleFormFieldMap;

    const appendIfMapped = (key: keyof LeadFormInput, value: string | undefined): void => {
      const entryKey = map[key];
      if (!entryKey || !value) return;
      payload.set(entryKey, value);
    };

    appendIfMapped("fullName", leadInput.fullName);
    appendIfMapped("email", leadInput.email);
    appendIfMapped("instagramHandle", leadInput.instagramHandle);
    appendIfMapped("primaryGoal", leadInput.primaryGoal);
    appendIfMapped("selectedPlan", leadInput.selectedPlan);
    appendIfMapped("message", leadInput.message);

    try {
      await fetch(SITE_LINKS.googleFormAction, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: payload.toString()
      });

      setFeedback(feedbackEl, "Inquiry submitted. I will get back to you shortly.", "success");
      form.reset();
    } catch {
      setFeedback(feedbackEl, "Submission failed. Please try again in a few minutes.", "error");
    }
  });
}

function init(): void {
  setExternalLinks();
  setupMobileMenu();
  setupMobileActionSheet();
  setupMobileTabScrollSpy();
  setupMobileStartCtaVisibility();
  setupSmoothAnchors();
  setupScrollReveal();
  setupCalculator();
  setupPlanButtons();
  setupLeadForm();
}

init();
