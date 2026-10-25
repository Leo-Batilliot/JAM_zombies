import { JoinRejection, type ClientConfig } from "@horde/shared";
import { JoinError } from "./net/connection.js";

type Skins = ClientConfig["content"]["skins"];

const errorMessages: Record<JoinRejection, string> = {
  [JoinRejection.InvalidName]:
    "This name is not allowed. Use letters, digits, spaces, _ or -.",
  [JoinRejection.Full]: "The game is full. Try again in a moment.",
};

export interface HomeActions {
  play: (name: string, skin: number) => Promise<void>;
  watch: () => Promise<void>;
}

export interface Home {
  setSkins: (
    skins: Skins,
    preview: (id: string) => HTMLCanvasElement | undefined,
  ) => void;
}

export const showHome = (root: HTMLElement, actions: HomeActions): Home => {
  const home = document.createElement("div");
  home.className = "home";
  home.innerHTML = `
    <h1>Horde.io</h1>
    <form>
      <input name="name" placeholder="Your name" autocomplete="off" required />
      <button type="submit">Play</button>
    </form>
    <div class="skins"></div>
    <button type="button" class="watch">Watch the game</button>
    <p class="error"></p>
    <blockquote>
      "They're coming to get you, Barbara."
      <cite>Night of the Living Dead (1968)</cite>
    </blockquote>
  `;
  root.append(home);

  const form = home.querySelector("form") as HTMLFormElement;
  const input = form.elements.namedItem("name") as HTMLInputElement;
  const play = form.querySelector("button") as HTMLButtonElement;
  const watch = home.querySelector(".watch") as HTMLButtonElement;
  const skins = home.querySelector(".skins") as HTMLElement;
  const error = home.querySelector(".error") as HTMLElement;
  let skin = 0;
  input.focus();

  const run = (action: () => Promise<void>): void => {
    play.disabled = true;
    watch.disabled = true;
    error.textContent = "";
    action().then(
      () => {
        home.remove();
      },
      (reason: unknown) => {
        play.disabled = false;
        watch.disabled = false;
        error.textContent =
          reason instanceof JoinError && reason.reason !== undefined
            ? errorMessages[reason.reason]
            : "Cannot reach the server.";
      },
    );
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(() => actions.play(input.value, skin));
  });
  watch.addEventListener("click", () => {
    run(actions.watch);
  });

  return {
    setSkins: (list, preview) => {
      skin = Math.min(skin, Math.max(list.length - 1, 0));
      const buttons = list.map((entry, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.title = entry.name;
        const picture = preview(entry.id);
        if (picture !== undefined) {
          button.append(picture);
        }
        const label = document.createElement("span");
        label.textContent = entry.name;
        button.append(label);
        button.addEventListener("click", () => {
          skin = index;
          for (const other of buttons) {
            other.classList.toggle("selected", other === button);
          }
        });
        button.classList.toggle("selected", index === skin);
        return button;
      });
      skins.replaceChildren(...buttons);
    },
  };
};
