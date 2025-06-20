// src/commands/Command.ts

/**
 * 命令接口 (Command Interface)
 * 所有对布局进行修改的操作（如添加、移动、删除、改变属性）
 * 都必须被封装成一个实现了此接口的命令对象。
 */
export interface Command {
    /**
     * 执行命令的方法。
     * 它会应用更改到中央状态。
     */
    execute(): void;
  
    /**
     * 撤销命令的方法。
     * 它会将中央状态恢复到执行此命令之前的状态。
     */
    undo(): void;
  }
  