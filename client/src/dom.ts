export const getElement = <T extends HTMLElement>(
  selector: string,
  type: abstract new () => T,
): T => {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`Missing element ${selector}`);
  }
  return element;
};
