import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';
import { pxToVW, pxToVH, pxToPercent } from '../utils/positionUnitConverter';

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

  // 获取控件层级信息
  private getControlLevelInfo(controlId: string) {
    // 递归查找控件及其父级
    for (const key in layout.controlSets) {
      const set = layout.controlSets[key];
      const result = this.findControlWithParent(set, controlId);
      if (result) {
        const { control, parent } = result;
        return {
          control,
          parent,
          isTopGroup: control.type === 'group' && !parent,
          isGroupChild: parent && parent.type === 'group'
        };
      }
    }
    return null;
  }

  private findControlWithParent(controls: Control[], id: string, parent: Control | null = null): { control: Control, parent: Control | null } | null {
    for (const control of controls) {
      if (control.id === id) {
        return { control, parent };
      }
      if (control.controls) {
        const found = this.findControlWithParent(control.controls, id, control);
        if (found) return found;
      }
    }
    return null;
  }

  // 根据控件层级转换单位
  private convertPositionAndSize() {
    const info = this.getControlLevelInfo(this.controlId);
    let position: any = { anchor: 'top-left' };
    let size: any = {};

    if (info?.isTopGroup) {
      // group顶层控件，vw/vh
      const canvasWidth = 812; // 画布宽度
      const canvasHeight = 375; // 画布高度
      position.left = pxToVW(this.newRect.left, canvasWidth);
      position.top = pxToVH(this.newRect.top, canvasHeight);
      size.width = pxToVW(this.newRect.width, canvasWidth);
      size.height = pxToVH(this.newRect.height, canvasHeight);
    } else if (info?.isGroupChild && info.parent) {
      // group内子控件，%
      // 需要父group的尺寸
      const parentSize = info.parent.size;
      const parentWidth = typeof parentSize.width === 'string' ? parseFloat(parentSize.width) : 100;
      const parentHeight = typeof parentSize.height === 'string' ? parseFloat(parentSize.height) : 100;
      
      position.left = pxToPercent(this.newRect.left, parentWidth);
      position.top = pxToPercent(this.newRect.top, parentHeight);
      size.width = pxToPercent(this.newRect.width, parentWidth);
      size.height = pxToPercent(this.newRect.height, parentHeight);
    } else {
      // 普通控件，用 vw/vh
      const canvasWidth = 812;
      const canvasHeight = 375;
      position.left = pxToVW(this.newRect.left, canvasWidth);
      position.top = pxToVH(this.newRect.top, canvasHeight);
      size.width = pxToVW(this.newRect.width, canvasWidth);
      size.height = pxToVH(this.newRect.height, canvasHeight);
    }
    
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
      control.position.right = pxToVW(rightPx, canvasWidth);
    } else if (anchorX === 'center') {
      const canvasWidth = 812;
      const centerOffset = this.newRect.left + this.newRect.width / 2 - canvasWidth / 2;
      control.position.left = centerOffset === 0 ? '50%' : `calc(50% + ${pxToVW(centerOffset, canvasWidth)})`;
    }

    // 更新垂直位置
    if (anchorY === 'top') {
      control.position.top = position.top;
    } else if (anchorY === 'bottom') {
      // 对于 bottom 定位，需要计算 bottom 值
      const canvasHeight = 375;
      const bottomPx = canvasHeight - this.newRect.top - this.newRect.height;
      control.position.bottom = pxToVH(bottomPx, canvasHeight);
    } else if (anchorY === 'middle') {
      const canvasHeight = 375;
      const centerOffset = this.newRect.top + this.newRect.height / 2 - canvasHeight / 2;
      control.position.top = centerOffset === 0 ? '50%' : `calc(50% + ${pxToVH(centerOffset, canvasHeight)})`;
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