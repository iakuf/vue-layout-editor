import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';

// 辅助函数，用于在复杂的层级结构中递归查找控件
function findControlRecursive(controls: Control[], id: string): Control | null {
  for (const c of controls) {
      if (c.id === id) return c;
      if (c.controls) {
          const found = findControlRecursive(c.controls, id);
          if (found) return found;
      }
  }
  return null;
}

// 查找控件并返回控件对象和其父容器信息
function findControlWithParent(id: string): { control: Control | null; parent: Control[] | null; index: number } {
    // 先在顶层查找
    for (const key in layout.controlSets) {
        const controls = layout.controlSets[key];
        const index = controls.findIndex(c => c.id === id);
        if (index !== -1) {
            return { control: controls[index], parent: controls, index };
        }
        
        // 递归在嵌套控件中查找
        const result = findControlWithParentRecursive(controls, id);
        if (result.control) {
            return result;
        }
    }
    return { control: null, parent: null, index: -1 };
}

function findControlWithParentRecursive(controls: Control[], id: string): { control: Control | null; parent: Control[] | null; index: number } {
    for (const control of controls) {
        if (control.controls) {
            const index = control.controls.findIndex(c => c.id === id);
            if (index !== -1) {
                return { control: control.controls[index], parent: control.controls, index };
            }
            
            const result = findControlWithParentRecursive(control.controls, id);
            if (result.control) {
                return result;
            }
        }
    }
    return { control: null, parent: null, index: -1 };
}

function findControlById(id: string): Control | null {
    for (const key in layout.controlSets) {
        const found = findControlRecursive(layout.controlSets[key], id);
        if (found) return found;
    }
    return null;
}

interface MoveToGroupInfo {
  controlId: string;
  targetGroupId: string;
  oldParent: Control[] | null;
  oldIndex: number;
  newPosition: any; // 在组内的相对位置
}

export class MoveToGroupCommand implements Command {
  private moveInfo: MoveToGroupInfo;
  private controlSnapshot: Control;

  constructor(controlId: string, targetGroupId: string, newPosition: any) {
    const { control, parent, index } = findControlWithParent(controlId);
    
    if (!control || !parent) {
      throw new Error(`无法找到控件 ${controlId}`);
    }

    this.moveInfo = {
      controlId,
      targetGroupId,
      oldParent: parent,
      oldIndex: index,
      newPosition
    };

    // 深拷贝控件快照，用于撤销操作
    this.controlSnapshot = JSON.parse(JSON.stringify(control));
  }

  public execute(): void {
    const { controlId, targetGroupId, oldParent, oldIndex, newPosition } = this.moveInfo;
    
    // 查找目标组
    const targetGroup = findControlById(targetGroupId);
    if (!targetGroup || targetGroup.type !== 'group') {
      throw new Error(`目标组 ${targetGroupId} 不存在或不是组类型`);
    }

    // 确保目标组有controls数组
    if (!targetGroup.controls) {
      targetGroup.controls = [];
    }

    // 从原位置移除控件
    if (oldParent && oldIndex >= 0) {
      const control = oldParent.splice(oldIndex, 1)[0];
      
      // 🔧 保存控件的原始尺寸
      const originalSize = { ...control.size };
      
      // 🔧 只更新控件位置为相对于组的位置，保持原始尺寸
      control.position = newPosition;
      control.size = originalSize; // 保持原始尺寸不变
      
      // 添加到目标组
      targetGroup.controls.push(control);
      
      console.log(`✅ 控件 ${control.label} 已移动到组 ${targetGroup.label} 内`, {
        组内控件数: targetGroup.controls.length,
        新位置: control.position,
        保持尺寸: control.size
      });
    }
  }

  public undo(): void {
    const { controlId, targetGroupId, oldParent, oldIndex } = this.moveInfo;
    
    // 查找目标组
    const targetGroup = findControlById(targetGroupId);
    if (!targetGroup || !targetGroup.controls) {
      return;
    }

    // 从目标组中移除控件
    const controlIndex = targetGroup.controls.findIndex(c => c.id === controlId);
    if (controlIndex >= 0) {
      targetGroup.controls.splice(controlIndex, 1);
    }

    // 恢复控件到原位置
    if (oldParent) {
      // 恢复控件的原始状态
      const restoredControl = JSON.parse(JSON.stringify(this.controlSnapshot));
      oldParent.splice(oldIndex, 0, restoredControl);
      
      console.log(`控件 ${controlId} 已从组 ${targetGroupId} 恢复到原位置`);
    }
  }
} 