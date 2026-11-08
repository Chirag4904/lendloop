import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const token = (name: string) => {
  const value = css.match(new RegExp(`--${name}: (#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`Missing ${name} color token`);
  return value;
};
const luminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

test("brand colors and text pairs meet WCAG AA for normal text", () => {
  expect(token("cream").toLowerCase()).toBe("#f7f6f2");
  expect(token("blue").toLowerCase()).toBe("#2854c5");
  expect(token("tangerine").toLowerCase()).toBe("#f4b46a");
  expect(token("ink").toLowerCase()).toBe("#202938");
  expect(token("paper").toLowerCase()).toBe("#ffffff");
  for (const [foreground, background] of [
    [token("ink"), token("cream")],
    [token("ink"), token("paper")],
    [token("muted"), token("cream")],
    [token("muted"), token("paper")],
    [token("blue"), token("paper")],
    [token("blue"), token("blue-soft")],
    [token("paper"), token("blue")],
    [token("paper"), token("blue-dark")],
    [token("ink"), token("tangerine")],
    [token("blue"), "#d4def5"],
  ]) {
    expect(
      contrast(foreground, background),
      `${foreground} on ${background}`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});
