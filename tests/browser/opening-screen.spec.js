import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 1200 },
  { name: "phone", width: 390, height: 844 },
];

for (const viewport of viewports) {
  test(`${viewport.name} opening screen is readable and fits`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const heading = page.getByRole("heading", {
      name: "What income goal are you working toward?",
    });
    const input = page.getByLabel("Your goal");
    const button = page.getByRole("button", { name: "Give me 3 tasks" });

    await expect(heading).toBeVisible();
    await expect(input).toBeVisible();
    await expect(button).toBeVisible();
    await expect(input).toHaveAttribute(
      "placeholder",
      "Earn ₹50,000 a month from freelance design",
    );

    const layout = await page.evaluate(() => {
      const selectors = ["h1", ".intro p", "textarea", "button[type=submit]"];
      const boxes = selectors.map((selector) =>
        document.querySelector(selector).getBoundingClientRect(),
      );
      const hasOverlap = boxes.some((box, index) =>
        boxes.slice(index + 1).some(
          (other) =>
            box.left < other.right &&
            box.right > other.left &&
            box.top < other.bottom &&
            box.bottom > other.top,
        ),
      );

      return {
        hasHorizontalScroll:
          document.documentElement.scrollWidth > window.innerWidth,
        hasOverlap,
        helperFontSize: Number.parseFloat(
          getComputedStyle(document.querySelector(".intro p")).fontSize,
        ),
        inputFontSize: Number.parseFloat(
          getComputedStyle(document.querySelector("textarea")).fontSize,
        ),
        inputHeight: boxes[2].height,
        buttonHeight: boxes[3].height,
        markHeight: document
          .querySelector(".number-panel")
          .getBoundingClientRect().height,
        workPanelPaddingTop: Number.parseFloat(
          getComputedStyle(document.querySelector(".work-panel")).paddingTop,
        ),
      };
    });

    expect(layout.hasHorizontalScroll).toBe(false);
    expect(layout.hasOverlap).toBe(false);
    expect(layout.helperFontSize).toBeGreaterThanOrEqual(16);
    expect(layout.inputFontSize).toBeGreaterThanOrEqual(16);
    expect(layout.inputHeight).toBeGreaterThanOrEqual(120);
    expect(layout.buttonHeight).toBeGreaterThanOrEqual(44);

    if (viewport.name === "phone") {
      expect(layout.markHeight).toBeLessThanOrEqual(112);
      expect(layout.workPanelPaddingTop).toBeLessThanOrEqual(32);
    }

    await page.screenshot({
      path: `test-results/opening-${viewport.width}.png`,
      fullPage: true,
    });
  });
}

test("a freelance income goal produces three relevant top tasks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await page
    .getByLabel("Your goal")
    .fill("Earn ₹50,000 a month from freelance design");
  await page.getByRole("button", { name: "Give me 3 tasks" }).click();

  const importantTasks = page.getByRole("list", {
    name: "Most important tasks",
  });
  await expect(importantTasks.getByRole("listitem")).toHaveCount(3, {
    timeout: 45_000,
  });

  const taskText = await importantTasks.textContent();
  expect(taskText).toMatch(/design|portfolio|service/i);
  expect(taskText).toMatch(/client|business|prospect|outreach/i);
});
