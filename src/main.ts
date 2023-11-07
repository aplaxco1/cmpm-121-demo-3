import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board } from "./board";

const GAMEPLAY_ZOOM_LEVEL = 19;
const NEIGHBORHOOD_SIZE = 8;
const TILE_DEGREES = 1e-4;
const PIT_SPAWN_PROBABILITY = 0.1;

const INITIAL_LOCATION = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const mapBoard = new Board(1, NEIGHBORHOOD_SIZE);

const mapContainer = document.querySelector<HTMLElement>("#map")!;

const map = leaflet.map(mapContainer, {
  center: INITIAL_LOCATION,
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

const playerMarker = leaflet.marker(INITIAL_LOCATION);
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

const northButton = document.querySelector("#north")!;
northButton.addEventListener("click", () => {
  movePlayer(0, TILE_DEGREES);
});
const southButton = document.querySelector("#south")!;
southButton.addEventListener("click", () => {
  movePlayer(0, -TILE_DEGREES);
});
const westButton = document.querySelector("#west")!;
westButton.addEventListener("click", () => {
  movePlayer(-TILE_DEGREES, 0);
});
const eastButton = document.querySelector("#east")!;
eastButton.addEventListener("click", () => {
  movePlayer(TILE_DEGREES, 0);
});

function movePlayer(i: number, j: number) {
  let currPosition: leaflet.LatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(
    leaflet.latLng(currPosition.lat + j, currPosition.lng + i)
  );
  map.setView(playerMarker.getLatLng());
}

function redrawPits() {
  let currCells = mapBoard.getCellsNearPoint(INITIAL_LOCATION);
  for (let cell of currCells) {
    if (luck([cell.i, cell.j].toString()) < PIT_SPAWN_PROBABILITY) {
      makePit(cell.i, cell.j);
    }
  }
}

redrawPits();

let collectedCoins: Coin[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No coins yet...";

interface Coin {
  i: number;
  j: number;
  serial: number;
}

function coinToString(coin: Coin): string {
  let coinString = coin.i + ":" + coin.j + "#" + coin.serial;
  return coinString;
}

function coinToStringList(coins: Coin[]): string {
  let coinStrings = "";
  for (let coin of coins) {
    coinStrings += coinToString(coin) + "<br>";
  }
  return coinStrings;
}

function makePit(i: number, j: number) {
  const bounds = mapBoard.getCellBounds({ i: i, j: j });

  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  // set up coins
  let numCoins = Math.floor(luck([i, j, "initialValue"].toString()) * 5);
  let coins: Coin[] = [];
  for (let coin = 0; coin < numCoins; coin++) {
    let currCoin: Coin = { i: i, j: j, serial: coin };
    coins.push(currCoin);
  }
  let coinList: string = coinToStringList(coins);

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has <span id="numCoins">${coins.length}</span> coins.<br>Current Coins: <br><span id="coinList">${coinList}</span></div>
                <button id="collect">collect</button><button id="deposit">deposit</button`;
    const collectButton =
      container.querySelector<HTMLButtonElement>("#collect")!;
    collectButton.addEventListener("click", () => {
      if (coins.length > 0) {
        let collectedCoin = coins.pop();
        container.querySelector<HTMLSpanElement>("#numCoins")!.innerHTML =
          coins.length.toString();
        coinList = coinToStringList(coins);
        container.querySelector<HTMLSpanElement>("#coinList")!.innerHTML =
          coinList;
        collectedCoins.push(collectedCoin!);
        statusPanel.innerHTML = `${collectedCoins.length} coins collected`;
      } else {
        alert("No coins to collect.");
      }
    });
    const depositButton =
      container.querySelector<HTMLButtonElement>("#deposit")!;
    depositButton.addEventListener("click", () => {
      if (collectedCoins.length > 0) {
        let depositedCoin = collectedCoins.pop();
        coins.push(depositedCoin!);
        container.querySelector<HTMLSpanElement>("#numCoins")!.innerHTML =
          coins.length.toString();
        coinList = coinToStringList(coins);
        container.querySelector<HTMLSpanElement>("#coinList")!.innerHTML =
          coinList;
        statusPanel.innerHTML = `${collectedCoins.length} coins collected`;
      } else {
        alert("No coins to deposit.");
      }
    });
    return container;
  });
  pit.addTo(map);
}
