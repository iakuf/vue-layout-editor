import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';
// 编辑器内部统一使用 px 单位，只在导入导出时转换

export class ResizeControlCommand implements Command {
  private controlId: string;
  private newRect: { left: number; top: number; width: number; height: number };
  private oldPosition: any;
  private oldSize: any;

  constructor(controlId: string, newRect: { left: number; top: number; width: number; height: number }) {
    this.controlId = controlId;
    this.newRect = newRect;

    // 在构造时就获取旧值
    const control = this.findControl();
    if (control) {
      this.oldPosition = JSON.parse(JSON.stringify(control.position));
      this.oldSize = JSON.parse(JSON.stringify(control.size));
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



  // 编辑器内部统一使用 px 单位
  private convertPositionAndSize() {
    let position: any = { anchor: 'top-left' };
    let size: any = {};

    // 统一使用 px 单位
    position.left = `${this.newRect.left}px`;
    position.top = `${this.newRect.top}px`;
    size.width = `${this.newRect.width}px`;
    size.height = `${this.newRect.height}px`;
    
    return { position, size };
  }

  public execute(): void {
    const control = this.findControl();
    if (!control) return;

    console.log('🔧 执行缩放命令:', {
      控件: control.label,
      旧位置: this.oldPosition,
      旧尺寸: this.oldSize,
      新矩形: this.newRect
    });

    // 根据控件层级转换单位
    const { position, size } = this.convertPositionAndSize();

    // 更新位置
    const anchor = control.position.anchor || 'top-left';
    const parts = anchor.split('-');
    const anchorY = parts[0];
    const anchorX = parts[1];

    // 更新水平位置
    if (anchorX === 'left') {
      control.position.left = position.left;
    } else if (anchorX === 'right') {
      // 对于 right 定位，需要计算 right 值
      const canvasWidth = 812;
      const rightPx = canvasWidth - this.newRect.left - this.newRect.width;
      control.position.right = `${rightPx}px`;
    } else if (anchorX === 'center') {
      const canvasWidth = 812;
      const centerOffset = this.newRect.left + this.newRect.width / 2 - canvasWidth / 2;
      control.position.left = centerOffset === 0 ? '50%' : `calc(50% + ${centerOffset}px)`;
    }

    // 更新垂直位置
    if (anchorY === 'top') {
      control.position.top = position.top;
    } else if (anchorY === 'bottom') {
      // 对于 bottom 定位，需要计算 bottom 值
      const canvasHeight = 375;
      const bottomPx = canvasHeight - this.newRect.top - this.newRect.height;
      control.position.bottom = `${bottomPx}px`;
    } else if (anchorY === 'middle') {
      const canvasHeight = 375;
      const centerOffset = this.newRect.top + this.newRect.height / 2 - canvasHeight / 2;
      control.position.top = centerOffset === 0 ? '50%' : `calc(50% + ${centerOffset}px)`;
    }

    // 更新尺寸
    control.size.width = size.width;
    control.size.height = size.height;

    console.log('✅ 缩放命令执行完成:', {
      新位置: control.position,
      新尺寸: control.size
    });
  }

  public undo(): void {
    const control = this.findControl();
    if (!control) return;

    console.log('↩️ 撤销缩放命令:', {
      控件: control.label,
      恢复位置: this.oldPosition,
      恢复尺寸: this.oldSize
    });

    // 恢复位置和尺寸
    control.position = JSON.parse(JSON.stringify(this.oldPosition));
    control.size = JSON.parse(JSON.stringify(this.oldSize));
  }
} 