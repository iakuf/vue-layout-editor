// src/commands/UpdatePropertyCommand.ts

import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';

export class UpdatePropertyCommand implements Command {
  private controlId: string;
  private propertyPath: string; // 改为字符串以支持嵌套路径
  private newValue: any;
  private oldValue: any;

  constructor(controlId: string, propertyPath: string, newValue: any) {
    this.controlId = controlId;
    this.propertyPath = propertyPath;
    this.newValue = newValue;

    // 在构造时就获取旧值
    const control = this.findControl();
    if (control) {
      this.oldValue = this.getNestedValue(control, propertyPath);
    }
  }

  private findControl(): Control | null {
    // 递归查找控件
    for (const key in layout.controlSets) {
      const set = layout.controlSets[key];
      const found = this.findControlRecursive(set, this.controlId);
      if (found) return found;
    }
    return null;
  }

  private findControlRecursive(controls: Control[], id: string): Control | null {
    for (const control of controls) {
      if (control.id === id) return control;
      if (control.controls) {
        const found = this.findControlRecursive(control.controls, id);
        if (found) return found;
      }
    }
    return null;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  public execute(): void {
    const control = this.findControl();
    if (control) {
      this.setNestedValue(control, this.propertyPath, this.newValue);
    }
  }

  public undo(): void {
    const control = this.findControl();
    if (control) {
      this.setNestedValue(control, this.propertyPath, this.oldValue);
    }
  }
}
