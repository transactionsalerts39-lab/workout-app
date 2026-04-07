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
  | "calculator";

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

let closeMobileMenuPanel: () => void = () => {};

const toNumber = (value: FormDataEntryValue | null): number => Number(value ?? 0);

const formatKcal = (value: number): string => `${Math.round(value)} kcal`;
const formatGram = (value: number): string => `${Math.round(value)} g`;

function isMobileView(): boolean {
  return mobileBreakpoint.matches;
}

function closeMobileOverlays(): void {
  closeMobileMenuPanel();
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
  setupSmoothAnchors();
  setupScrollReveal();
  setupCalculator();
  setupPlanButtons();
  setupLeadForm();
}

init();
