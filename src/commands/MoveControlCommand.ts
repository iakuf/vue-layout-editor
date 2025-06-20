import { type Command } from './Command';
import { layout } from '../store';
import type { Control } from '../types';

// 辅助函数，用于在复杂的层级结构中递归查找控件
function findControlRecursive(controls: Control[], id: string): Control | null {
    for (const control of controls) {
        if (control.id === id) {
            return control;
        }
        // 如果是group或radial等容器类型，则递归其子控件
        if (control.controls) {
            const found = findControlRecursive(control.controls, id);
            if (found) return found;
        }
    }
    return null;
}

export class MoveControlCommand implements Command {
    private controlId: string;
    private oldPosition: object;
    private newPosition: object;
    private oldSize: object;
    private newSize: object;

    constructor(controlId: string, newPos: object, oldPos: object, newSize: object, oldSize: object) {
        this.controlId = controlId;
        // 使用深拷贝确保命令持有的是独立的副本
        this.newPosition = JSON.parse(JSON.stringify(newPos));
        this.oldPosition = JSON.parse(JSON.stringify(oldPos));
        this.newSize = JSON.parse(JSON.stringify(newSize));
        this.oldSize = JSON.parse(JSON.stringify(oldSize));
    }

    private findTargetControl(): Control | null {
        for (const key in layout.controlSets) {
            const found = findControlRecursive(layout.controlSets[key], this.controlId);
            if (found) return found;
        }
        return null;
    }

    public execute(): void {
        const control = this.findTargetControl();
        if (control) {
            control.position = this.newPosition;
            control.size = this.newSize;
        }
    }

    public undo(): void {
        const control = this.findTargetControl();
        if (control) {
            control.position = this.oldPosition;
            control.size = this.oldSize;
        }
    }
}