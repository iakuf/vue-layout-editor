// src/commands/UpdatePropertyCommand.ts

import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';

export class UpdatePropertyCommand implements Command {
  private controlId: string;
  private propertyKey: keyof Control; // 使用 keyof 确保属性名是合法的
  private newValue: any;
  private oldValue: any;

  constructor(controlId: string, propertyKey: keyof Control, newValue: any) {
    this.controlId = controlId;
    this.propertyKey = propertyKey;
    this.newValue = newValue;

    // 在构造时就获取旧值
    const control = layout.controlSets[layout.initialSet]?.find(c => c.id === this.controlId);
    if (control) {
      this.oldValue = JSON.parse(JSON.stringify(control[propertyKey]));
    }
  }

  public execute(): void {
    const control = layout.controlSets[layout.initialSet]?.find(c => c.id === this.controlId);
    if (control) {
      control[this.propertyKey] = this.newValue;
    }
  }

  public undo(): void {
    const control = layout.controlSets[layout.initialSet]?.find(c => c.id === this.controlId);
    if (control) {
      control[this.propertyKey] = this.oldValue;
    }
  }
}
