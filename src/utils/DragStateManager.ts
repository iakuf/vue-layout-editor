import type { Control } from '../types';
import { ControlTreeManager, type ControlLocation } from './ControlTreeManager';

export interface DragSession {
  draggedControlId: string;
  draggedControl: Control;
  draggedLocation: ControlLocation;
  selectedControlIds: string[];
  startPositions: Map<string, any>;
  isDragging: boolean;
  startTime: number;
}

export interface DropTarget {
  targetGroupId: string;
  targetGroup: Control;
  relativePosition: any;
}

export class DragStateManager {
  private static currentSession: DragSession | null = null;

  /**
   * 开始拖拽会话
   */
  static startDragSession(draggedControlId: string, selectedControlIds: string[]): DragSession | null {
    const draggedLocation = ControlTreeManager.findControl(draggedControlId);
    if (!draggedLocation) {
      console.error(`无法找到拖拽控件: ${draggedControlId}`);
      return null;
    }

    // 只移动当前拖拽的控件，而不是所有选中的控件
    let finalSelectedIds = [draggedControlId];
    
    // 如果拖拽的是组控件，确保只移动组本身，不包括子控件
    if (draggedLocation.control.type === 'group') {
      console.log('🎯 拖拽组控件 - 只移动组本身，排除子控件');
      
      // 排除所有子控件
      const descendants = ControlTreeManager.getAllDescendants(draggedControlId);
      const descendantIds = descendants.map(d => d.id);
      finalSelectedIds = finalSelectedIds.filter(id => !descendantIds.includes(id));
    }

    // 记录所有选中控件的初始位置
    const startPositions = new Map<string, any>();
    for (const id of finalSelectedIds) {
      const location = ControlTreeManager.findControl(id);
      if (location) {
        startPositions.set(id, JSON.parse(JSON.stringify(location.control.position)));
      }
    }

    this.currentSession = {
      draggedControlId,
      draggedControl: draggedLocation.control,
      draggedLocation,
      selectedControlIds: finalSelectedIds,
      startPositions,
      isDragging: true,
      startTime: Date.now()
    };

    console.log('🚀 拖拽会话开始:', {
      拖拽控件: draggedLocation.control.label,
      控件类型: draggedLocation.control.type,
      选中控件数: finalSelectedIds.length,
      初始位置数: startPositions.size,
      控件层级: draggedLocation.level
    });

    return this.currentSession;
  }

  /**
   * 检测拖拽入组
   */
  static detectDropTarget(mouseX: number, mouseY: number, canvasRef: HTMLElement): DropTarget | null {
    if (!this.currentSession) return null;

    const { draggedControlId } = this.currentSession;
    const allGroups = ControlTreeManager.getAllGroups();

    for (const group of allGroups) {
      // 跳过拖拽控件本身（如果是组）
      if (group.id === draggedControlId) continue;
      
      // 跳过拖拽控件的子组件
      if (ControlTreeManager.isAncestor(draggedControlId, group.id)) continue;

      const groupElement = canvasRef.querySelector(`[data-id='${group.id}']`) as HTMLElement;
      if (!groupElement) continue;

      const canvasRect = canvasRef.getBoundingClientRect();
      const groupRect = groupElement.getBoundingClientRect();

      // 转换为相对于画布的坐标
      const groupLeft = groupRect.left - canvasRect.left;
      const groupTop = groupRect.top - canvasRect.top;
      const groupRight = groupRect.right - canvasRect.left;
      const groupBottom = groupRect.bottom - canvasRect.top;

      // 检测是否在组内
      const isInGroup = mouseX >= groupLeft && mouseX <= groupRight &&
                       mouseY >= groupTop && mouseY <= groupBottom;

      if (isInGroup) {
        // 计算相对位置
        const relativePosition = this.calculateRelativePosition(
          mouseX - groupLeft,
          mouseY - groupTop
        );

        console.log('🎯 检测到拖拽入组:', {
          目标组: group.label,
          鼠标位置: { x: mouseX, y: mouseY },
          组边界: { left: groupLeft, top: groupTop, right: groupRight, bottom: groupBottom },
          相对位置: relativePosition
        });

        return {
          targetGroupId: group.id,
          targetGroup: group,
          relativePosition
        };
      }
    }

    return null;
  }

  /**
   * 计算相对于组的位置
   */
  private static calculateRelativePosition(relativeX: number, relativeY: number): any {
    // 标题栏高度
    const titleBarHeight = 30;
    
    // 确保位置在内容区域内
    const finalX = Math.max(10, relativeX);
    const finalY = Math.max(titleBarHeight + 10, relativeY);

    return {
      anchor: 'top-left',
      left: `${finalX}px`,
      top: `${finalY}px`
    };
  }

  /**
   * 结束拖拽会话
   */
  static endDragSession(): DragSession | null {
    const session = this.currentSession;
    this.currentSession = null;

    if (session) {
      console.log('🏁 拖拽会话结束:', {
        持续时间: Date.now() - session.startTime,
        控件: session.draggedControl.label
      });
    }

    return session;
  }

  /**
   * 获取当前拖拽会话
   */
  static getCurrentSession(): DragSession | null {
    return this.currentSession;
  }

  /**
   * 检查是否正在拖拽
   */
  static isDragging(): boolean {
    return this.currentSession !== null;
  }
} 