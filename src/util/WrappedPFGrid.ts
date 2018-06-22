import * as PF from 'pathfinding';

// https://github.com/qiao/PathFinding.js/issues/155#issuecomment-375397063
export default class WrappedPFGrid extends PF.Grid {
  nodes!: PF.Node[][];

  getNeighbors(
    node: PF.Node,
    diagonalMovement: PF.DiagonalMovement
  ): PF.Node[] {
    if (diagonalMovement !== PF.DiagonalMovement.Never) {
      throw new Error("haven't implemented diagonal movement for this yet");
    }
    var x = node.x,
      y = node.y,
      neighbors: PF.Node[] = [],
      nodes = this.nodes;

    const wrap = (x: number, y: number) => {
      if (x === -1) {
        x = this.width - 1;
      } else if (x === this.width) {
        x = 0;
      }

      if (y === -1) {
        y = this.height - 1;
      } else if (y === this.height) {
        y = 0;
      }
      return [x, y];
    };

    const pushIfWalkable = (x: number, y: number) => {
      const wrapped = wrap(x, y);
      if (this.isWalkableAt(wrapped[0], wrapped[1])) {
        neighbors.push(nodes[wrapped[1]][wrapped[0]]);
      }
    };

    // ↑
    pushIfWalkable(x, y - 1);
    // →
    pushIfWalkable(x + 1, y);
    // ↓
    pushIfWalkable(x, y + 1);
    // ←
    pushIfWalkable(x - 1, y);

    return neighbors;
  }
}
