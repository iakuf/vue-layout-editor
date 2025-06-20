// src/commands/LoadLayoutCommand.ts

import { type Command } from './Command';
import { layout } from '../store';
import type { Layout } from '../types';

export class LoadLayoutCommand implements Command {
  private newLayout: Layout;
  private oldLayout: Layout;

  constructor(newLayout: Layout) {
    // 使用深拷贝确保命令持有独立的布局副本
    this.newLayout = JSON.parse(JSON.stringify(newLayout));
    this.oldLayout = JSON.parse(JSON.stringify(layout));
  }

  public execute(): void {
    // 使用 Object.assign 来响应式地更新整个 layout 对象
    Object.assign(layout, this.newLayout);
  }

  public undo(): void {
    // 恢复旧的布局
    Object.assign(layout, this.oldLayout);
  }
}