import { Level, Tile } from './GameState';
import { getTilesOfType } from './tileMap';

export const levelTiles = `
xxxxxxxxx xxxxxxxxx xxxxxxxxx xxxxxxxxx
   o  x                         x  o   
xxxxx x x x x x x x x x x x x x x xxxxx
x     x                         x     x
x x x x xxxxxxxxxxx xxxxxxxxxxx x x x x
x x x           x     x           x x x
x x x xxxxxxxxx x     x xxxxxxxxx x x x
x x x           x     x           x x x
x x x xxx xxxxxxx     xxxxxxx xxx x x x
x   x     x                 x     x   x
x xxx xxx x                 x xxx xxx x
                                       
xxxxx xxx x                 x xxx xxxxx
x       x x                 x x       x
x x x x x xxxxxxx     xxxxxxx x x x x x
x x x   x       x     x       x   x x x
x x xxx x xxxxx x     x xxxxx x xxx x x
x x           x x     x x           x x
x   xxx x xxx x xxx xxx x xxx x xxx   x
x x     x                     x     x x
x xxxxx x x x x xxx xxx x x x x xxxxx x
x  o      x                 x      o  x
xxxxxxxxx xxxxxxxxx xxxxxxxxx xxxxxxxxx
`;

const charToTile: { [char: string]: Tile } = {
  x: 'wall',
  o: 'spawn',
  ' ': null,
};

export function getLevelFromString(str: string): Level {
  const tiles: Tile[][] = [];
  const lines = str.trim().split('\n');

  for (let y = 0; y < lines.length; y += 1) {
    tiles[y] = [];
    for (let x = 0; x < lines[y].length; x += 1) {
      const tile = charToTile[lines[y][x]];
      tiles[y][x] = tile;
    }
  }

  const spawns = getTilesOfType(tiles, 'spawn');

  return { tiles, spawns };
}

function mirrorLevel(halfString: string): string {
  return halfString
    .trimLeft()
    .split('\n')
    .map((row, yIdx, arr) => {
      const width = row.length;

      const mirroredRow = row
        .split('')
        .map((cell, xIdx) => {
          const x = width - xIdx - 1;
          return row[x];
        })
        .join('');

      return row + ' ' + mirroredRow;
    })
    .join('\n');
}

// console.log(mirrorLevel(tilesStringHalf));
