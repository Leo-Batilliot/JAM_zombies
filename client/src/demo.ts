import {
  ClientMessageType,
  DemoCommand,
  type ClientConfig,
} from "@horde/shared";
import type { Connection } from "./net/connection.js";

type DemoKeys = ClientConfig["client"]["demoKeys"];

const demoParam = "demo";

const commands: { command: DemoCommand; key: keyof DemoKeys; label: string }[] =
  [
    { command: DemoCommand.Screamer, key: "screamer", label: "Screamer" },
    { command: DemoCommand.Boss, key: "boss", label: "Pumpkin" },
    { command: DemoCommand.Units, key: "units", label: "Units" },
  ];

export const isDemo = (search: string): boolean =>
  new URLSearchParams(search).get(demoParam) === "1";

export const demoCommand = (
  key: string,
  keys: DemoKeys,
): DemoCommand | undefined =>
  commands.find((entry) => keys[entry.key] === key.toLowerCase())?.command;

export const startDemo = (root: HTMLElement, connection: Connection): void => {
  const send = (command: DemoCommand): void => {
    connection.send({ type: ClientMessageType.Demo, command });
  };
  const panel = document.createElement("div");
  panel.className = "demo";
  for (const { command, key, label } of commands) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${label} [${connection.config.client.demoKeys[key].toUpperCase()}]`;
    button.addEventListener("click", () => {
      send(command);
    });
    panel.append(button);
  }
  root.append(panel);
  window.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }
    const command = demoCommand(event.key, connection.config.client.demoKeys);
    if (command !== undefined) {
      send(command);
    }
  });
};
