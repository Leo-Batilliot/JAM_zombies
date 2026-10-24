import "./style.css";
import { getElement } from "./dom.js";
import { loadAtlas } from "./game/assets.js";
import { startGame } from "./game/game.js";
import { showHome } from "./home.js";
import { join } from "./net/connection.js";

const atlas = loadAtlas();

const ui = getElement("#ui", HTMLElement);

showHome(ui, async (name) => {
  const connection = await join(name);
  connection.onClose = () => {
    location.reload();
  };
  await startGame(
    getElement("#game", HTMLElement),
    ui,
    connection,
    await atlas,
  );
});
