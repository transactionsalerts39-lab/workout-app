const form = document.getElementById("calc-form");
const maintenanceEl = document.getElementById("maintenance");
const goalEl = document.getElementById("goal-calories");
const proteinEl = document.getElementById("protein");

const formatNumber = (value) => `${Math.round(value)} kcal`;

const getGoalFactor = (goal) => {
  if (goal === "cut") return 0.85;
  if (goal === "build") return 1.1;
  return 1;
};

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const weight = Number(data.get("weight"));
  const height = Number(data.get("height"));
  const age = Number(data.get("age"));
  const sex = data.get("sex");
  const activity = Number(data.get("activity"));
  const goal = data.get("goal");

  if (!weight || !height || !age) return;

  const sexFactor = sex === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexFactor;
  const maintenance = bmr * activity;
  const goalCalories = maintenance * getGoalFactor(goal);
  const protein = weight * 1.8;

  maintenanceEl.textContent = formatNumber(maintenance);
  goalEl.textContent = formatNumber(goalCalories);
  proteinEl.textContent = `${Math.round(protein)} g/day`;
});
