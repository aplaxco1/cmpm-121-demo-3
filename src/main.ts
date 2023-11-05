import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board";

const GAMEPLAY_ZOOM_LEVEL = 19;
const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const mapBoard = new Board(1, NEIGHBORHOOD_SIZE);

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: MERRILL_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerMarker.setLatLng(
      leaflet.latLng(position.coords.latitude, position.coords.longitude)
    );
    map.setView(playerMarker.getLatLng());
  });
});

let collectedCoins = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

function makePit(i: number, j: number) {
  const bounds = mapBoard.getCellBounds({ i: i, j: j });

  const pit = leaflet.rectangle(bounds) as leaflet.Layer;
  let coins = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has <span id="coins">${coins}</span> coins.</div>
                <button id="collect">collect</button><button id="deposit">deposit</button`;
    const collectButton =
      container.querySelector<HTMLButtonElement>("#collect")!;
    collectButton.addEventListener("click", () => {
      if (coins > 0) {
        coins--;
        container.querySelector<HTMLSpanElement>("#coins")!.innerHTML =
          coins.toString();
        collectedCoins++;
        statusPanel.innerHTML = `${collectedCoins} coins collected`;
      } else {
        alert("No coins to collect.");
      }
    });
    const depositButton =
      container.querySelector<HTMLButtonElement>("#deposit")!;
    depositButton.addEventListener("click", () => {
      if (collectedCoins > 0) {
        coins++;
        container.querySelector<HTMLSpanElement>("#coins")!.innerHTML =
          coins.toString();
        collectedCoins--;
        statusPanel.innerHTML = `${collectedCoins} coins collected`;
      } else {
        alert("No coins to deposit.");
      }
    });
    return container;
  });
  pit.addTo(map);
}

let currCells = mapBoard.getCellsNearPoint(MERRILL_CLASSROOM);
for (let cell of currCells) {
  if (luck([cell.i, cell.j].toString()) < PIT_SPAWN_PROBABILITY) {
    makePit(cell.i, cell.j);
  }
}
