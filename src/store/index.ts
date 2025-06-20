// src/store/index.ts

import { reactive, ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { Layout, Control } from '../types';
import type { Command } from '../commands/Command';

// 整个布局的核心响应式状态
export const layout = reactive<Layout>({
    layoutId: uuidv4(),
    name: '我的新布局',
    initialSet: 'default',
    controlSets: {
        default: [],
    },
});

// 将 selectedControlId 修改为数组
export const selectedControlIds = ref<string[]>([]);

// 计算属性现在返回第一个被选中的控件，主要用于属性检查器
export const primarySelectedControl = computed<Control | undefined>(() => {
  if (selectedControlIds.value.length === 0) return undefined;
  const firstId = selectedControlIds.value[0];
  // 未来需要递归查找
  for (const key in layout.controlSets) {
      const set = layout.controlSets[key];
      const found = findControlRecursive(set, firstId); // 使用一个查找函数
      if (found) return found;
  }
  return undefined;
});

// 递归查找函数（可以在store或一个工具文件中定义）
function findControlRecursive(controls: Control[], id: string): Control | null {
    for (const control of controls) {
        if (control.id === id) return control;
        if (control.controls) {
            const found = findControlRecursive(control.controls, id);
            if (found) return found;
        }
    }
    return null;
 }

// 清空选择的辅助函数
export function clearSelection() {
    selectedControlIds.value = [];
}
// 通过计算属性获取当前选中的控件对象
export const selectedControl = computed<Control | undefined>(() => {
    // 注意：这里需要一个更健壮的查找逻辑，因为控件可能在不同的 set 或 group 中
    // 暂时简化为只在默认 set 中查找
    if (selectedControlIds.value.length === 0) return undefined;
    const firstId = selectedControlIds.value[0];
    return layout.controlSets[layout.initialSet]?.find(c => c.id === firstId);
});


// --- 命令历史记录栈 ---
const undoStack = ref<Command[]>([]);
const redoStack = ref<Command[]>([]);


/**
 * 执行一个新命令。
 * 这是修改应用状态的唯一入口。
 * @param command 要执行的命令对象
 */
export function executeCommand(command: Command) {
    command.execute(); // 执行命令，修改 layout 状态
    undoStack.value.push(command); // 将命令推入撤销栈
    redoStack.value = []; // 任何新操作都会清空重做栈
}

/**
 * 撤销上一步操作。
 */
export function undo() {
    const command = undoStack.value.pop();
    if (command) {
        command.undo(); // 调用命令的 undo 方法
        redoStack.value.push(command); // 将被撤销的命令推入重做栈
    }
}

/**
 * 重做上一步被撤销的操作。
 */
export function redo() {
    const command = redoStack.value.pop();
    if (command) {
        command.execute(); // 重新执行命令
        undoStack.value.push(command); // 将命令再次推入撤销栈
    }
}
