import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';

interface MoveInfo {
  controlId: string;
  oldPosition: any;
  newPosition: any;
}

// 辅助函数，用于在复杂的层级结构中递归查找控件
function findControlRecursive(controls: Control[], id: string): Control | null {
  for (const c of controls) {
      if (c.id === id) return c;
      if (c.controls) {
          const found = findControlRecursive(c.controls, id);
          if (found) return found;
      }
  }
  return null;
}

function findControlById(id: string): Control | null {
    for (const key in layout.controlSets) {
        const found = findControlRecursive(layout.controlSets[key], id);
        if (found) return found;
    }
    return null;
}


export class BatchMoveCommand implements Command {
  private moves: MoveInfo[];

  constructor(moves: MoveInfo[]) {
    this.moves = JSON.parse(JSON.stringify(moves));
  }

  public execute(): void {
    this.moves.forEach(({ controlId, newPosition }) => {
      const control = findControlById(controlId);
      if (control) {
        control.position = newPosition;
      }
    });
  }

  public undo(): void {
    this.moves.forEach(({ controlId, oldPosition }) => {
      const control = findControlById(controlId);
      if (control) {
        control.position = oldPosition;
      }
    });
  }
}