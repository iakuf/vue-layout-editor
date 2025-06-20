// src/commands/DeleteControlCommand.ts

import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';

export class DeleteControlCommand implements Command {
  private controlId: string;
  private deletedControl: Control | null = null;
  private originalIndex: number = -1;
  private parentControlSet: Control[];

  constructor(controlId: string) {
    this.controlId = controlId;
    // 假设只在默认 set 中操作
    this.parentControlSet = layout.controlSets[layout.initialSet];
  }

  public execute(): void {
    this.originalIndex = this.parentControlSet.findIndex(c => c.id === this.controlId);
    if (this.originalIndex > -1) {
      // 移除控件，并保存被删除的控件对象
      this.deletedControl = this.parentControlSet.splice(this.originalIndex, 1)[0];
    }
  }

  public undo(): void {
    // 如果成功删除了控件，并且记录了它的原始位置
    if (this.deletedControl && this.originalIndex > -1) {
      // 将被删除的控件插回到它原来的位置
      this.parentControlSet.splice(this.originalIndex, 0, this.deletedControl);
      // 重置状态，以便命令可以被重做
      this.deletedControl = null;
      this.originalIndex = -1;
    }
  }
}
