import { JoinRejection } from "@horde/shared";
import { JoinError } from "./net/connection.js";

const errorMessages: Record<JoinRejection, string> = {
  [JoinRejection.InvalidName]:
    "This name is not allowed. Use letters, digits, spaces, _ or -.",
};

export const showHome = (
  root: HTMLElement,
  onPlay: (name: string) => Promise<void>,
): void => {
  const home = document.createElement("div");
  home.className = "home";
  home.innerHTML = `
    <h1>Horde.io</h1>
    <form>
      <input name="name" placeholder="Your name" autocomplete="off" required />
      <button type="submit">Play</button>
    </form>
    <p class="error"></p>
    <blockquote>
      "They're coming to get you, Barbara."
      <cite>Night of the Living Dead (1968)</cite>
    </blockquote>
  `;
  root.append(home);

  const form = home.querySelector("form") as HTMLFormElement;
  const input = form.elements.namedItem("name") as HTMLInputElement;
  const button = form.querySelector("button") as HTMLButtonElement;
  const error = home.querySelector(".error") as HTMLElement;
  input.focus();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    button.disabled = true;
    error.textContent = "";
    onPlay(input.value).then(
      () => {
        home.remove();
      },
      (reason: unknown) => {
        button.disabled = false;
        error.textContent =
          reason instanceof JoinError && reason.reason !== undefined
            ? errorMessages[reason.reason]
            : "Cannot reach the server.";
      },
    );
  });
};
