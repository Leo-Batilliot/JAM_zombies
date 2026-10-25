import "./style.css";
import { AudioEngine } from "./audio/engine.js";
import { getElement } from "./dom.js";
import { loadAtlas } from "./game/assets.js";
import { startGame } from "./game/game.js";
import { skinPreview } from "./game/preview.js";
import { showHome } from "./home.js";
import { connect, type Connection, type Gate } from "./net/connection.js";

const atlas = loadAtlas();

const ui = getElement("#ui", HTMLElement);
const audio = new AudioEngine();

const enter = async (connection: Connection): Promise<void> => {
  connection.onClose = () => {
    location.reload();
  };
  await startGame(
    getElement("#game", HTMLElement),
    ui,
    connection,
    await atlas,
    audio,
  );
};

const home = showHome(ui, {
  play: async (name, skin) => {
    audio.unlock();
    await enter(await (await ready()).join(name, skin));
  },
  watch: async () => {
    audio.unlock();
    await enter(await (await ready()).watch());
  },
});

const open = (): Promise<Gate> => {
  const pending = connect();
  Promise.all([pending, atlas]).then(
    ([gate, sheet]) => {
      home.setSkins(gate.config.content.skins, (id) =>
        skinPreview(sheet.textures, id),
      );
    },
    () => undefined,
  );
  return pending;
};

let gate = open();

const ready = async (): Promise<Gate> => {
  const current = await gate.catch(() => undefined);
  if (current?.open === true) {
    return current;
  }
  gate = open();
  return gate;
};
