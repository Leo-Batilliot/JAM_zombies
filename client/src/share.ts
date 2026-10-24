import QRCode from "qrcode";
import "./style.css";
import { getElement } from "./dom.js";

const url = location.origin;
getElement("#url", HTMLElement).textContent = url;
void QRCode.toCanvas(getElement("#qr", HTMLCanvasElement), url, {
  width: Math.min(window.innerWidth, window.innerHeight) * 0.7,
  margin: 2,
});
