import leaflet from "leaflet";

const CELL_DEGREES = 1e4;
const POINT_DEGREES = 1e-4;

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    this.knownCells.set(key, cell);
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = point.lat * CELL_DEGREES;
    const j = point.lng * CELL_DEGREES;
    return this.getCanonicalCell({ i, j });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const bounds = leaflet.latLngBounds([
      [cell.i * POINT_DEGREES, cell.j * POINT_DEGREES],
      [
        (cell.i + this.tileWidth) * POINT_DEGREES,
        (cell.j + this.tileWidth) * POINT_DEGREES,
      ],
    ]);
    return bounds;
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    const t = this;
    for (
      let i = -t.tileVisibilityRadius;
      i < t.tileVisibilityRadius;
      i += t.tileWidth
    ) {
      for (
        let j = -t.tileVisibilityRadius;
        j < t.tileVisibilityRadius;
        j += t.tileWidth
      ) {
        let currCell = { i: originCell.i + i, j: originCell.j + j };
        resultCells.push(t.getCanonicalCell(currCell));
      }
    }
    return resultCells;
  }
}
