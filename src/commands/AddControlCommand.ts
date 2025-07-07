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
    // 确保 targetSet 存在，如果不存在则创建
    if (!layout.controlSets[layout.initialSet]) {
      layout.controlSets[layout.initialSet] = [];
    }
    
    const targetSet = layout.controlSets[layout.initialSet];
    if (targetSet) {
      targetSet.push(this.newControl);
      console.log('✅ 控件添加成功:', { id: this.newControl.id, type: this.newControl.type });
    } else {
      console.error('❌ 无法添加控件：targetSet 不存在');
    }
  }

  public undo(): void {
    const targetSet = layout.controlSets[layout.initialSet];
    if (targetSet) {
      const index = targetSet.findIndex(c => c.id === this.newControl.id);
      if (index > -1) {
        targetSet.splice(index, 1);
        console.log('↩️ 控件删除成功:', { id: this.newControl.id });
      }
    }
  }
}