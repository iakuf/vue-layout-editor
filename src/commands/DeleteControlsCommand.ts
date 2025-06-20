import { type Command } from './Command';
import { layout, clearSelection, selectedControlIds } from '../store';
import type { Control } from '../types';

interface DeletedInfo {
  control: Control;
  parentSet: Control[];
  originalIndex: number;
}

export class DeleteControlsCommand implements Command {
  private deletedInfos: DeletedInfo[] = [];
  private controlIds: string[];

  constructor(controlIds: string[]) {
    this.controlIds = [...controlIds];
  }

  private findControlAndParent(id: string): {control: Control, parent: Control[]} | null {
    for (const key in layout.controlSets) {
        const set = layout.controlSets[key];
        for (let i = 0; i < set.length; i++) {
            if (set[i].id === id) {
                return { control: set[i], parent: set };
            }
            // 未来需要递归查找 group
        }
    }
    return null;
  }

  public execute(): void {
    // 为了正确的撤销顺序，从后向前删除
    this.controlIds.reverse().forEach(id => {
        const result = this.findControlAndParent(id);
        if(result) {
            const { control, parent } = result;
            const originalIndex = parent.indexOf(control);
            if (originalIndex > -1) {
                parent.splice(originalIndex, 1);
                this.deletedInfos.push({ control, parentSet: parent, originalIndex });
            }
        }
    });
    clearSelection();
  }

  public undo(): void {
    // 以相反的顺序恢复（即原始的删除顺序）
    this.deletedInfos.reverse().forEach(({ control, parentSet, originalIndex }) => {
        parentSet.splice(originalIndex, 0, control);
    });
    // 恢复选择状态
    selectedControlIds.value = this.controlIds.reverse();
    this.deletedInfos = [];
  }
}