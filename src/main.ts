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
    mapContainer.dispatchEvent(playerMovedEvent);
    redrawPits(playerMarker.getLatLng());
  });
});

const playerMovedEvent = new Event("player-moved");

const northButton = document.querySelector("#north")!;
northButton.addEventListener("click", () => {
  movePlayer(0, TILE_DEGREES);
  mapContainer.dispatchEvent(playerMovedEvent);
  redrawPits(playerMarker.getLatLng());
});
const southButton = document.querySelector("#south")!;
southButton.addEventListener("click", () => {
  movePlayer(0, -TILE_DEGREES);
  mapContainer.dispatchEvent(playerMovedEvent);
  redrawPits(playerMarker.getLatLng());
});
const westButton = document.querySelector("#west")!;
westButton.addEventListener("click", () => {
  movePlayer(-TILE_DEGREES, 0);
  mapContainer.dispatchEvent(playerMovedEvent);
  redrawPits(playerMarker.getLatLng());
});
const eastButton = document.querySelector("#east")!;
eastButton.addEventListener("click", () => {
  movePlayer(TILE_DEGREES, 0);
  mapContainer.dispatchEvent(playerMovedEvent);
  redrawPits(playerMarker.getLatLng());
});

function movePlayer(i: number, j: number) {
  let currPosition: leaflet.LatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(
    leaflet.latLng(currPosition.lat + j, currPosition.lng + i)
  );
  map.setView(playerMarker.getLatLng());
}

function redrawPits(location: leaflet.LatLng) {
  let currCells = mapBoard.getCellsNearPoint(location);
  for (let cell of currCells) {
    if (luck([cell.i, cell.j].toString()) < PIT_SPAWN_PROBABILITY) {
      makePit(cell.i, cell.j);
    }
  }
}

interface Coin {
  i: number;
  j: number;
  serial: number;
}

function coinToString(coin: Coin): string {
  let coinString = coin.i + ":" + coin.j + "#" + coin.serial;
  return coinString;
}

let collectedCoins: Coin[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = `Inventory:<br><span id=coinList></span>`;

function updatePlayerInventory() {
  statusPanel.querySelector<HTMLSpanElement>("#coinList")!.innerHTML = ``;
  for (let coin of collectedCoins) {
    statusPanel.querySelector<HTMLSpanElement>(
      "#coinList"
    )!.innerHTML += `${coinToString(coin)}<br>`;
  }
}
updatePlayerInventory();

let geocacheMap: Map<string, string> = new Map();

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

class Geocache implements Momento<string> {
  i: number;
  j: number;
  coins: Coin[];

  constructor(i: number, j: number) {
    this.i = i;
    this.j = j;
    this.coins = [];
  }
  toMomento() {
    let momento = JSON.stringify({ i: this.i, j: this.j, coins: this.coins });
    return momento;
  }

  fromMomento(momento: string) {
    let momentoObj = JSON.parse(momento);
    this.i = momentoObj.i;
    this.j = momentoObj.j;
    this.coins = momentoObj.coins;
  }
}

function makePit(i: number, j: number) {
  const bounds = mapBoard.getCellBounds({ i: i, j: j });
  const pit = leaflet.rectangle(bounds) as leaflet.Layer;

  let numCoins: number;
  let coins: Coin[] = [];

  let geoCacheData = new Geocache(i, j);
  let existingData = geocacheMap.get([i, j].toString());
  if (existingData) {
    geoCacheData.fromMomento(existingData);
    coins = geoCacheData.coins;
    numCoins = coins.length;
  } else {
    // set up new coins if geocahce did not already exist
    numCoins = Math.floor(luck([i, j, "initialValue"].toString()) * 5);
    for (let coin = 0; coin < numCoins; coin++) {
      let currCoin: Coin = { i: i, j: j, serial: coin };
      coins.push(currCoin);
    }
    geoCacheData.coins = coins;
    geocacheMap.set([i, j].toString(), geoCacheData.toMomento());
  }

  pit.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has <span id="numCoins">${coins.length}</span> coins.<br>Inventory: <br><span id="coinList"></span></div>
                <button id="deposit">deposit</button`;

    function updateCoinInventory() {
      container.querySelector<HTMLSpanElement>("#coinList")!.innerHTML = ``;
      for (let coin of coins) {
        addCoinButton(coin);
      }
    }
    updateCoinInventory();

    function addCoinButton(coin: Coin) {
      const coinText = document.createElement("span");
      coinText.innerHTML = coinToString(coin);
      container.querySelector<HTMLSpanElement>("#coinList")!.append(coinText);
      const collectButton = document.createElement("button");
      collectButton.innerHTML = "collect";
      collectButton.addEventListener("click", () => {
        collectedCoins.push(coin);
        coins.splice(coins.indexOf(coin), 1);
        geoCacheData.coins = coins;
        geocacheMap.set([i, j].toString(), geoCacheData.toMomento());
        updateCoinInventory();
        updatePlayerInventory();
      });
      container
        .querySelector<HTMLSpanElement>("#coinList")!
        .append(collectButton);
    }

    const depositButton =
      container.querySelector<HTMLButtonElement>("#deposit")!;
    depositButton.addEventListener("click", () => {
      if (collectedCoins.length > 0) {
        let depositedCoin = collectedCoins.pop();
        coins.push(depositedCoin!);
        container.querySelector<HTMLSpanElement>("#numCoins")!.innerHTML =
          coins.length.toString();
      } else {
        alert("No coins to deposit.");
      }
      updateCoinInventory();
      updatePlayerInventory();
      geoCacheData.coins = coins;
      geocacheMap.set([i, j].toString(), geoCacheData.toMomento());
    });

    return container;
  });

  pit.addTo(map);

  mapContainer.addEventListener("player-moved", () => {
    pit.removeFrom(map);
  });
}

redrawPits(INITIAL_LOCATION);
