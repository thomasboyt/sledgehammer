import { Tile } from './types';
import { WORLD_SIZE_HEIGHT, WORLD_SIZE_WIDTH } from './constants';

const levelOneTiles = `
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

const levelTwoTiles = `
xxxxxxxxxxxxx xxxxx xxxxx xxxxxxxxxxxxx
x o x         x         x         x o x
  x   xxxxxxxxx xxxxxxx xxxxxxxxx   x  
x x x                             x x x
x x xxxxxxxxx xxxxxxxxxxx xxxxxxxxx x x
x x x       x x         x x       x x x
x x x       x x         x x       x x x
x   x       x x         x x       x   x
xx xx       xxx         xxx       xx xx
                                       
xx xx       xxx         xxx       xx xx
x   x       x x         x x       x   x
x x x       x x         x x       x x x
x x x       x x         x x       x x x
x x xxxxxxxxx xxxxxxxxxxx xxxxxxxxx x x
x x                                 x x
x x x xxxxxxx xxxxxxxxxxx xxxxxxx x x x
                                       
x x xxxx xxxx x xxx xxx x xxxx xxxx x x
x x    x x    x   x x   x    x x    x x
x xxxx x x xxxxxx x x xxxxxx x x xxxx x
x o               x x               o x
xxxxxxxxxxxxx xxxxx xxxxx xxxxxxxxxxxxx
`;

const levelThreeTiles = `
xxxxxxxxx xxxxxxxxxxxxxxxxxxx xxxxxxxxx
                   x                   
x                                     x
                   x                   
x                                     x
                   x                   
x                                     x
                   x                   
x                                     x
                   x                   
x                                     x
                   x                   
x                                     x
                   x                   
xxxxxxxxx xxxxxxxxxxxxxxxxxxx xxxxxxxxx
                                       
xxx xxxxx x xxxxxxx xxxxxxx x xxxxx xxx
  x       x                 x       x  
x xxxxxxx xxxxx xx x xx xxxxx xxxxxxx x
x x           x    x    x           x x
x x xxx x xxx xxxx x xxxx xxx x xxx x x
  o     x    o     x     o    x     o  
xxxxxxxxx xxxxxxxxxxxxxxxxxxx xxxxxxxxx
`;

const charToTile: { [char: string]: Tile } = {
  x: Tile.Wall,
  o: Tile.Spawn,
  ' ': Tile.Empty,
};

function getTilesFromString(str: string): Tile[][] {
  const tiles: Tile[][] = [];
  const lines = str.trim().split('\n');

  for (let y = 0; y < lines.length; y += 1) {
    tiles[y] = [];
    for (let x = 0; x < lines[y].length; x += 1) {
      const tile = charToTile[lines[y][x]];
      tiles[y][x] = tile;
    }

    if (tiles[y].length !== WORLD_SIZE_WIDTH) {
      throw new Error(
        `row ${y} of level is not the correct width ${WORLD_SIZE_WIDTH}`
      );
    }
  }

  if (tiles.length !== WORLD_SIZE_HEIGHT) {
    throw new Error(`level is not the correct height ${WORLD_SIZE_HEIGHT}`);
  }

  return tiles;
}

export interface LevelData {
  tiles: Tile[][];
  color: string;
}

export const levels: LevelData[] = [
  {
    tiles: getTilesFromString(levelOneTiles),
    color: '#E8AEB7',
  },
  {
    tiles: getTilesFromString(levelTwoTiles),
    color: '#B8E1FF',
  },
  {
    tiles: getTilesFromString(levelThreeTiles),
    color: '#A9FFF7',
  },
];

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
