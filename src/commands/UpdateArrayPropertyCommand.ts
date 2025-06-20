import { type Command } from './Command';
import { get, set, cloneDeep } from 'lodash-es';
import { layout } from '../store';

export class UpdateArrayPropertyCommand implements Command {
  private controlId: string;
  private arrayPath: string; // e.g., 'controls' or 'buttons'
  private action: 'add' | 'remove' | 'update';
  private item?: any;
  private itemIndex?: number;
  private oldItem?: any;

  constructor(controlId: string, arrayPath: string, action: 'add' | 'remove' | 'update', options: { item?: any, itemIndex?: number }) {
    this.controlId = controlId;
    this.arrayPath = arrayPath;
    this.action = action;
    this.item = cloneDeep(options.item);
    this.itemIndex = options.itemIndex;
    // ... (在构造时可以保存旧状态)
  }

  private getArray(): any[] | null {
    const control = findControlById(this.controlId); // 需要一个全局的查找函数
    return control ? get(control, this.arrayPath) : null;
  }

  public execute(): void {
    const array = this.getArray();
    if (!array) return;
    if (this.action === 'add' && this.item) {
      array.push(this.item);
    } else if (this.action === 'remove' && this.itemIndex !== undefined) {
      this.oldItem = array.splice(this.itemIndex, 1)[0];
    } else if (this.action === 'update' && this.itemIndex !== undefined && this.item) {
      this.oldItem = array[this.itemIndex];
      array[this.itemIndex] = this.item;
    }
  }

  public undo(): void {
    const array = this.getArray();
    if (!array) return;
     if (this.action === 'add') {
      array.pop();
    } else if (this.action === 'remove' && this.oldItem && this.itemIndex !== undefined) {
      array.splice(this.itemIndex, 0, this.oldItem);
    } else if (this.action === 'update' && this.oldItem && this.itemIndex !== undefined) {
      array[this.itemIndex] = this.oldItem;
    }
  }
}