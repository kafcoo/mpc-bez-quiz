import { test, expect, type Page } from "@playwright/test";
const nav = (page: Page, label: string) =>
  page
    .getByRole("navigation")
    .getByRole("button", { name: label, exact: true });
async function group(page: Page, from = 1, to = 2) {
  await page.getByRole("button", { name: /Podle tebe Výběr skupiny/ }).click();
  await page.getByLabel("Od otázky").fill(String(from));
  await page.getByLabel("Do otázky").fill(String(to));
  await page.getByLabel("Náhodné pořadí").uncheck();
  await page.getByRole("button", { name: "Spustit procvičování" }).click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("skupina, chyba, obnova, problémové otázky, dokončení a historie", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Bezpečně k zápočtu." }),
  ).toBeVisible();
  await group(page);
  await expect(page.locator(".quiz-progress")).toContainText("Otázka 1 z 2");
  await page
    .getByRole("button", { name: /v případě přetížení zařízení/ })
    .click();
  await expect(page.getByText("Tentokrát to nevyšlo")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Pokračovat v testu" }).click();
  await expect(page.getByText("Tentokrát to nevyšlo")).toBeVisible();
  await expect(page.locator(".answer:disabled")).toHaveCount(3);
  await page.getByRole("button", { name: "Další otázka" }).click();
  const options = await page.locator(".answer").allTextContents();
  await page.keyboard.press(
    String(options.findIndex((text) => text.includes("žlutá")) + 1),
  );
  await expect(
    page.getByRole("button", { name: "Dokončit test" }),
  ).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Hotovo. Každý pokus posouvá." }),
  ).toBeVisible();
  await nav(page, "Moje výsledky").click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Nejčastější chyby" }),
  ).toBeVisible();
  await nav(page, "Přehled").click();
  await page.getByRole("button", { name: /Problémové otázky Zaměř/ }).click();
  await page.getByRole("button", { name: "Spustit procvičování" }).click();
  await expect(page.locator(".quiz-progress")).toContainText("Otázka 1 z 1");
});
test("simulace skrývá klíč, časový limit se obnoví a vyhodnotí", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Náhodný test Vyzkoušej/ }).click();
  await page.getByLabel("Časový limit v minutách").fill("1");
  await page.getByRole("button", { name: "Spustit simulaci" }).click();
  await page.locator(".answer").first().click();
  await expect(page.locator(".feedback")).toHaveCount(0);
  await expect(page.locator(".explanation")).toHaveCount(0);
  await expect(page.locator(".quiz-progress")).not.toContainText("správně");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("mpc-bez-v1")!);
    s.active.deadline = new Date(Date.now() - 1000).toISOString();
    localStorage.setItem("mpc-bez-v1", JSON.stringify(s));
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hotovo. Každý pokus posouvá." }),
  ).toBeVisible();
  await expect(page.locator(".study-card")).toHaveCount(10);
});
test("přehled, lokální klíč, filtr, export a bezpečný import", async ({
  page,
}) => {
  await nav(page, "Přehled otázek").click();
  await expect(page.locator(".study-card")).toHaveCount(62);
  await page.getByLabel("Vyhledat otázku").fill("Doplňující pospojování");
  await expect(page.locator(".study-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Ukázat odpovědi" }).click();
  await expect(page.getByText("Klíč není určen · bez hodnocení")).toBeVisible();
  await page.getByRole("button", { name: "Upravit lokální klíč" }).click();
  await page
    .getByRole("combobox", { name: "Správná odpověď", exact: true })
    .selectOption("b");
  await page.getByLabel("Stav ověření").selectOption("verified");
  await page.getByRole("button", { name: "Uložit lokální změnu" }).click();
  await expect(page.locator(".key-correct")).toContainText("lze použít");
  await nav(page, "Nastavení").click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportovat postup", exact: true })
    .click();
  const file = await downloadEvent;
  expect(file.suggestedFilename()).toBe("mpc-bez-postup.json");
  const original = await page.evaluate(() =>
    localStorage.getItem("mpc-bez-v1"),
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":9}'),
  });
  await expect(page.getByRole("status")).toContainText("Neplatná");
  expect(await page.evaluate(() => localStorage.getItem("mpc-bez-v1"))).toBe(
    original,
  );
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "good.json",
    mimeType: "application/json",
    buffer: Buffer.from(original!),
  });
  await expect(page.getByRole("status")).toContainText("úspěšně obnovena");
});
test("kompletní test respektuje filtr, dostupnost a rozložení", async ({
  page,
}) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: /62 otázek Kompletní test/ }).click();
  await page.getByLabel("Pouze odborně posouzené odpovědi").check();
  await page.getByRole("button", { name: "Spustit procvičování" }).click();
  await expect(page.locator(".quiz-progress")).toContainText("z 25");
  await page.getByRole("button", { name: "Označit jako obtížnou" }).click();
  await expect(
    page.getByRole("button", { name: "Označit jako obtížnou" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("všech 62 otázek, tmavý režim, potvrzený reset a fokus dialogu", async ({
  page,
}) => {
  await page.getByRole("button", { name: /62 otázek Kompletní test/ }).click();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Spustit procvičování" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /62 otázek Kompletní test/ }).click();
  await page.getByRole("button", { name: "Spustit procvičování" }).click();
  await expect(page.locator(".quiz-progress")).toContainText("z 62");
  await page.locator(".answer").first().click();
  await nav(page, "Nastavení").click();
  await page.getByLabel("Tmavý režim").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await nav(page, "Nastavení").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Resetovat statistiky" }).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("mpc-bez-v1")!),
  );
  expect(state.answers).toEqual([]);
  expect(state.active).toBeNull();
  expect(state.settings.dark).toBe(true);
});
