import type { Control } from '../types';
import { layout } from '../store';

export interface ControlLocation {
  control: Control;
  parent: Control | null;
  parentArray: Control[];
  index: number;
  path: string[]; // 从根到当前控件的路径
  level: number;  // 嵌套层级 (0=顶层)
}

export class ControlTreeManager {
  /**
   * 查找控件并返回完整的位置信息
   */
  static findControl(id: string): ControlLocation | null {
    for (const setKey in layout.controlSets) {
      const result = this.findControlInArray(layout.controlSets[setKey], id, [], 0);
      if (result) return result;
    }
    return null;
  }

  /**
   * 在控件数组中递归查找控件
   */
  private static findControlInArray(
    controls: Control[], 
    id: string, 
    path: string[], 
    level: number,
    parent: Control | null = null
  ): ControlLocation | null {
    for (let i = 0; i < controls.length; i++) {
      const control = controls[i];
      const currentPath = [...path, control.id];
      
      if (control.id === id) {
        return {
          control,
          parent,
          parentArray: controls,
          index: i,
          path: currentPath,
          level
        };
      }
      
      // 递归查找子控件
      if (control.controls && control.controls.length > 0) {
        const result = this.findControlInArray(
          control.controls, 
          id, 
          currentPath, 
          level + 1, 
          control
        );
        if (result) return result;
      }
    }
    return null;
  }

  /**
   * 获取所有组控件
   */
  static getAllGroups(): Control[] {
    const groups: Control[] = [];
    this.collectGroups(Object.values(layout.controlSets).flat(), groups);
    return groups;
  }

  private static collectGroups(controls: Control[], groups: Control[]): void {
    for (const control of controls) {
      if (control.type === 'group') {
        groups.push(control);
      }
      if (control.controls) {
        this.collectGroups(control.controls, groups);
      }
    }
  }

  /**
   * 检查控件A是否是控件B的祖先
   */
  static isAncestor(ancestorId: string, descendantId: string): boolean {
    const descendantLoc = this.findControl(descendantId);
    return descendantLoc ? descendantLoc.path.includes(ancestorId) : false;
  }

  /**
   * 获取控件的所有子控件（递归）
   */
  static getAllDescendants(controlId: string): Control[] {
    const location = this.findControl(controlId);
    if (!location || !location.control.controls) return [];
    
    const descendants: Control[] = [];
    this.collectDescendants(location.control.controls, descendants);
    return descendants;
  }

  private static collectDescendants(controls: Control[], descendants: Control[]): void {
    for (const control of controls) {
      descendants.push(control);
      if (control.controls) {
        this.collectDescendants(control.controls, descendants);
      }
    }
  }

  /**
   * 计算控件的绝对位置（相对于画布）
   */
  static calculateAbsolutePosition(controlId: string, canvasRect: DOMRect): { x: number; y: number } | null {
    const location = this.findControl(controlId);
    if (!location) return null;

    let absoluteX = 0;
    let absoluteY = 0;

    // 从根开始累加位置
    for (let i = 0; i < location.path.length; i++) {
      const ctrlId = location.path[i];
      const ctrl = this.findControl(ctrlId)?.control;
      if (!ctrl) continue;

      const { x, y } = this.parsePosition(ctrl.position, canvasRect);
      absoluteX += x;
      absoluteY += y;
    }

    return { x: absoluteX, y: absoluteY };
  }

  /**
   * 解析位置对象为像素坐标
   */
  private static parsePosition(position: any, canvasRect: DOMRect): { x: number; y: number } {
    let x = 0;
    let y = 0;

    // 解析水平位置
    if (position.left) {
      if (typeof position.left === 'string') {
        if (position.left.includes('calc')) {
          const match = position.left.match(/calc\(50% \+ (.+)px\)/);
          const offset = match ? parseFloat(match[1]) : 0;
          x = canvasRect.width / 2 + offset;
        } else if (position.left.includes('%')) {
          const percent = parseFloat(position.left);
          x = canvasRect.width * percent / 100;
        } else {
          x = parseFloat(position.left);
        }
      }
    } else if (position.right) {
      const rightValue = parseFloat(position.right);
      x = canvasRect.width - rightValue;
    }

    // 解析垂直位置
    if (position.top) {
      if (typeof position.top === 'string') {
        if (position.top.includes('calc')) {
          const match = position.top.match(/calc\(50% \+ (.+)px\)/);
          const offset = match ? parseFloat(match[1]) : 0;
          y = canvasRect.height / 2 + offset;
        } else if (position.top.includes('%')) {
          const percent = parseFloat(position.top);
          y = canvasRect.height * percent / 100;
        } else {
          y = parseFloat(position.top);
        }
      }
    } else if (position.bottom) {
      const bottomValue = parseFloat(position.bottom);
      y = canvasRect.height - bottomValue;
    }

    return { x, y };
  }
} 