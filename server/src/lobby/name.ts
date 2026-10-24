import type { Config } from "@horde/shared";

const segmenter = new Intl.Segmenter();

export const validatePlayerName = (
  name: string,
  rules: Config["lobby"]["playerName"],
): string | undefined => {
  const trimmed = name.trim();
  const length = Array.from(segmenter.segment(trimmed)).length;
  if (length < rules.minLength || length > rules.maxLength) {
    return undefined;
  }
  return new RegExp(rules.pattern, "u").test(trimmed) ? trimmed : undefined;
};
