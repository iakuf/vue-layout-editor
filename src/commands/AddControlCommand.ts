// src/commands/AddControlCommand.ts

import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';

export class AddControlCommand implements Command {
  private newControl: Control;

  constructor(control: Control) {
    // 通过深拷贝确保命令持有的是一个独立的副本，不受外部修改影响
    this.newControl = JSON.parse(JSON.stringify(control));
  }

  public execute(): void {
    // 暂时简化为只操作默认的 controlSet
    const targetSet = layout.controlSets[layout.initialSet];
    if (targetSet) {
      targetSet.push(this.newControl);
    }
  }

  public undo(): void {
    const targetSet = layout.controlSets[layout.initialSet];
    if (targetSet) {
      const index = targetSet.findIndex(c => c.id === this.newControl.id);
      if (index > -1) {
        targetSet.splice(index, 1);
      }
    }
  }
}