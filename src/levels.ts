export const levelTiles = `
xxxxxxxxx xxxxxxxxx xxxxxxxxx xxxxxxxxx
      x                         x      
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
x         x                 x         x
xxxxxxxxx xxxxxxxxx xxxxxxxxx xxxxxxxxx
`;

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
