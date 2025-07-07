import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';
// 编辑器内部统一使用 px 单位，只在导入导出时转换

export class ResizeControlCommand implements Command {
  private controlId: string;
  private newRect: { left: number; top: number; width: number; height: number; anchor: string };
  private oldPosition: any;
  private oldSize: any;
  private oldAnchor: string | undefined; // 可选：为了撤销更完美，保存旧 anchor

  constructor(controlId: string, newRect: { left: number; top: number; width: number; height: number; anchor: string }) {
    this.controlId = controlId;
    this.newRect = newRect;

    const control = this.findControl();
    if (control) {
      // 深度克隆，防止引用问题
      this.oldPosition = JSON.parse(JSON.stringify(control.position));
      this.oldSize = JSON.parse(JSON.stringify(control.size));
      // ✨ 3. 同时保存旧的 anchor 值
      this.oldAnchor = control.position.anchor;
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

  // 找到 execute 方法并将其完全替换为以下内容：
  public execute(): void {
    const control = this.findControl();
    if (!control) return;
  
    console.log('🔧 执行 resize/move 命令 (新)', {
      控件ID: this.controlId,
      新矩形: this.newRect
    });
  
    // 直接修改响应式对象的属性，而不是替换整个对象
    // 1. 标准化锚点
    control.position.anchor = this.newRect.anchor;
  
    // 2. 设置新的绝对定位属性
    control.position.left = `${this.newRect.left}px`;
    control.position.top = `${this.newRect.top}px`;
  
    // 3. ✨ 最关键的修复：显式删除所有可能冲突的旧定位属性 ✨
    delete control.position.right;
    delete control.position.bottom;
  
    // 4. 更新尺寸
    control.size.width = `${this.newRect.width}px`;
    control.size.height = `${this.newRect.height}px`;
  
    console.log('✅ 命令执行完成, 控件状态已净化:', {
      新位置: control.position,
      新尺寸: control.size
    });
  }

  public undo(): void {
    const control = this.findControl();
    if (!control) return;

    console.log('↩️ 撤销命令:', {
      控件ID: this.controlId,
    });

    // 恢复旧的 position 和 size 对象
    control.position = this.oldPosition;
    control.size = this.oldSize;

    // 如果旧的 anchor 也保存了，可以恢复它
    // 这确保了撤销可以完美回到之前的状态，包括非 'top-left' 的锚点
    if (this.oldAnchor) {
      control.position.anchor = this.oldAnchor;
    }
  }
} 