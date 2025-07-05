<template>
  <div class="flex-grow p-5 flex justify-center items-center bg-gray-200">
    <div 
      id="layout-canvas"
      class="w-[812px] h-[375px] bg-white shadow-lg relative overflow-hidden" 
      ref="canvasRef"
      @pointerdown.self="handleCanvasClick"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <!-- 循环渲染所有控件 -->
      <component
        v-for="control in activeControls"
        :key="control.id"
        :is="control.type === 'group' ? GroupRenderer : ControlRenderer"
        :control="control"
        :is-selected="selectedControlIds.includes(control.id)"
        :is-primary-selected="selectedControlIds[0] === control.id"
        :selected-control-ids="selectedControlIds"
        @select="handleSelect"
        @drag-start="handleDragStart"
        @update-geometry="handleGeometryUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { Control } from '../types';
import { layout, executeCommand, selectedControlIds } from '../store';
import { ControlTreeManager } from '../utils/ControlTreeManager';
import { DragStateManager } from '../utils/DragStateManager';
import { createControl } from '../factories/controlFactory';
import { AddControlCommand } from '../commands/AddControlCommand';
import { BatchMoveCommand } from '../commands/BatchMoveCommand';
import { MoveToGroupCommand } from '../commands/MoveToGroupCommand';
import { ResizeControlCommand } from '../commands/ResizeControlCommand';
import GroupRenderer from './GroupRenderer.vue';
import ControlRenderer from './ControlRenderer.vue';
// 编辑器内部统一使用 px 单位，只在导入导出时转换

const canvasRef = ref<HTMLElement>();

// 计算属性：获取当前活动的控件列表
const activeControls = computed(() => {
  return layout.controlSets[layout.initialSet] || [];
});

// 处理控件选择
function handleSelect(controlId: string) {
  console.log('🎯 选择控件:', controlId);
  selectedControlIds.value = [controlId];
}

// 处理画布点击（取消选择）
function handleCanvasClick() {
  console.log('🖱️ 画布点击 - 取消选择');
  selectedControlIds.value = [];
}

// 工具函数：获取控件层级和类型信息
function getControlLevelInfo(controlId: string) {
  const location = ControlTreeManager.findControl(controlId);
  if (!location) return { isTopGroup: false, isGroupChild: false, parent: null, level: -1, control: null };

  const isTopGroup = location.parent === null && location.control.type === 'group';
  const isGroupChild = location.parent && location.parent.type === 'group';

  return {
    isTopGroup,
    isGroupChild,
    parent: location.parent,
    level: location.level,
    control: location.control
  };
}

// 处理拖拽开始
function handleDragStart({ controlId }: { controlId: string }) {
  console.log('🚀 拖拽开始处理:', controlId);
  const info = getControlLevelInfo(controlId);
  console.log('控件层级信息:', info);
  
  const session = DragStateManager.startDragSession(controlId, selectedControlIds.value);
  if (!session) {
    console.error('❌ 无法开始拖拽会话');
    return;
  }
  
  // 更新选中状态
  selectedControlIds.value = session.selectedControlIds;
}

// 处理几何更新（拖拽或缩放）
function handleGeometryUpdate({ id, dx, dy, newRect, isDrag }: { 
  id: string; 
  dx?: number; 
  dy?: number; 
  newRect?: any; 
  isDrag: boolean;
}) {
  console.log('🔄 几何更新:', { id, isDrag, dx, dy, newRect });
  
  if (!canvasRef.value) return;
  
  if (isDrag && dx !== undefined && dy !== undefined) {
    handleDragUpdate(id, dx, dy);
  } else if (!isDrag && newRect) {
    handleResizeUpdate(id, newRect);
  }
}

// 处理拖拽更新
function handleDragUpdate(draggedControlId: string, dx: number, dy: number) {
  if (!canvasRef.value) return;
  
  const session = DragStateManager.getCurrentSession();
  if (!session) {
    console.error('❌ 没有活动的拖拽会话');
    return;
  }
  
  // 计算拖拽后的鼠标位置
  const mousePosition = calculateMousePosition(draggedControlId, dx, dy);
  if (!mousePosition) return;
  
  // 检测拖拽入组
  const dropTarget = DragStateManager.detectDropTarget(
    mousePosition.x, 
    mousePosition.y, 
    canvasRef.value
  );
  
  if (dropTarget) {
    console.log('🎯 检测到拖拽入组，准备移动到组');
    handleMoveToGroup(draggedControlId, dropTarget);
  } else {
    console.log('📦 执行普通拖拽移动');
    handleNormalDrag(dx, dy);
  }
}

// 计算鼠标位置
function calculateMousePosition(controlId: string, dx: number, dy: number): { x: number; y: number } | null {
  if (!canvasRef.value) return null;
  
  const session = DragStateManager.getCurrentSession();
  if (!session) return null;
  
  const startPosition = session.startPositions.get(controlId);
  if (!startPosition) return null;
  
  const canvasRect = canvasRef.value.getBoundingClientRect();
  const newPosition = calculateNewPosition(dx, dy, startPosition, canvasRect);
  
  // 解析位置为坐标
  return parsePositionToCoordinates(newPosition, canvasRect);
}

// 计算新位置
function calculateNewPosition(dx: number, dy: number, startPosition: any, canvasRect: DOMRect): any {
  const position: any = { anchor: startPosition.anchor };
  
  // 解析锚点
  let anchorX: string, anchorY: string;
  if (startPosition.anchor === 'center') {
    anchorX = 'center';
    anchorY = 'middle';
  } else {
    const parts = startPosition.anchor.split('-');
    anchorY = parts[0];
    anchorX = parts[1];
  }
  
  // 计算水平位置
  if (anchorX === 'center') {
    const currentLeft = startPosition.left || '50%';
    if (currentLeft.includes('calc')) {
      const match = currentLeft.match(/calc\(50% \+ (.+)px\)/);
      const currentOffset = match ? parseFloat(match[1]) : 0;
      const newOffset = currentOffset + dx;
      position.left = newOffset === 0 ? '50%' : `calc(50% + ${newOffset}px)`;
    } else if (currentLeft === '50%') {
      position.left = `calc(50% + ${dx}px)`;
    }
  } else if (anchorX === 'left' && startPosition.left !== undefined) {
    const currentLeft = parseFloat(startPosition.left) || 0;
    position.left = `${Math.max(0, currentLeft + dx)}px`;
  } else if (anchorX === 'right' && startPosition.right !== undefined) {
    const currentRight = parseFloat(startPosition.right) || 0;
    position.right = `${Math.max(0, currentRight - dx)}px`;
  }
  
  // 计算垂直位置
  if (anchorY === 'middle') {
    const currentTop = startPosition.top || '50%';
    if (currentTop.includes('calc')) {
      const match = currentTop.match(/calc\(50% \+ (.+)px\)/);
      const currentOffset = match ? parseFloat(match[1]) : 0;
      const newOffset = currentOffset + dy;
      position.top = newOffset === 0 ? '50%' : `calc(50% + ${newOffset}px)`;
    } else if (currentTop === '50%') {
      position.top = `calc(50% + ${dy}px)`;
    }
  } else if (anchorY === 'top' && startPosition.top !== undefined) {
    const currentTop = parseFloat(startPosition.top) || 0;
    position.top = `${Math.max(0, currentTop + dy)}px`;
  } else if (anchorY === 'bottom' && startPosition.bottom !== undefined) {
    const currentBottom = parseFloat(startPosition.bottom) || 0;
    position.bottom = `${Math.max(0, currentBottom - dy)}px`;
  }
  
  return position;
}

// 解析位置为坐标
function parsePositionToCoordinates(position: any, canvasRect: DOMRect): { x: number; y: number } {
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

// 处理移动到组
function handleMoveToGroup(controlId: string, dropTarget: any) {
  // 检查控件是否已经在目标组内
  const location = ControlTreeManager.findControl(controlId);
  if (!location) return;
  
  if (location.parent && location.parent.id === dropTarget.targetGroupId) {
    console.log('⚠️ 控件已在目标组内，跳过移动');
    return;
  }
  
  nextTick(() => {
    try {
      const command = new MoveToGroupCommand(
        controlId, 
        dropTarget.targetGroupId, 
        dropTarget.relativePosition
      );
      executeCommand(command);
      
      // 更新选中状态
      selectedControlIds.value = [dropTarget.targetGroupId, controlId];
      
      console.log('✅ 控件已成功移入组');
    } catch (error) {
      console.error('❌ 移入组失败:', error);
    }
  });
}



// 修改handleNormalDrag，编辑器内部统一使用px单位
function handleNormalDrag(dx: number, dy: number) {
  const session = DragStateManager.getCurrentSession();
  if (!session || !canvasRef.value) return;

  const moves: any[] = [];

  session.selectedControlIds.forEach(controlId => {
    const location = ControlTreeManager.findControl(controlId);
    const startPosition = session.startPositions.get(controlId);

    if (location && startPosition) {
      // 计算新位置（保持px单位）
      let newLeft = startPosition.left;
      let newTop = startPosition.top;
      
      if (startPosition.left && typeof startPosition.left === 'string') {
        const currentLeft = parseFloat(startPosition.left);
        newLeft = `${currentLeft + dx}px`;
      }
      if (startPosition.top && typeof startPosition.top === 'string') {
        const currentTop = parseFloat(startPosition.top);
        newTop = `${currentTop + dy}px`;
      }

      const newPosition = {
        ...startPosition,
        left: newLeft,
        top: newTop
      };

      moves.push({
        controlId,
        oldPosition: startPosition,
        newPosition: newPosition
      });
    }
  });

  if (moves.length > 0) {
    const command = new BatchMoveCommand(moves);
    executeCommand(command);
  }

  // 结束拖拽会话
  DragStateManager.endDragSession();
}

// 修改handleResizeUpdate，写入layout前做单位转换
function handleResizeUpdate(controlId: string, newRect: any) {
  console.log('🔄 缩放更新:', { controlId, newRect });

  try {
    // 直接传递 px 数值给 ResizeControlCommand，让它内部处理单位转换
    const command = new ResizeControlCommand(controlId, {
      left: newRect.left,
      top: newRect.top,
      width: newRect.width,
      height: newRect.height
    });
    executeCommand(command);
    console.log('✅ 缩放命令执行成功');
  } catch (error) {
    console.error('❌ 缩放命令执行失败:', error);
  }
}

// 处理拖拽悬停事件
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

// 处理拖拽放置事件
function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (!canvasRef.value || !event.dataTransfer) return;

  const data = JSON.parse(event.dataTransfer.getData('application/json'));
  if (!data.type) return;

  // 计算相对于画布的放置坐标
  const canvasRect = canvasRef.value.getBoundingClientRect();
  const dropX = event.clientX - canvasRect.left;
  const dropY = event.clientY - canvasRect.top;

  // 判断是否为group类型
  let parentType: 'canvas' | 'group' = 'canvas';
  let parentRect = canvasRect;

  // 这里可以扩展：如果支持拖到group内部，需要获取group的rect
  // 目前默认都在画布上拖放

  // 使用工厂函数创建新的控件对象，传递parentType和parentRect
  const newControl = createControl(data.type, { x: dropX, y: dropY }, { parentType, parentRect });

  // 判断新控件类型
  const isGroup = newControl.type === 'group';
  if (isGroup) {
    console.log('新增的是顶层控件组，已使用vw/vh单位');
  } else {
    console.log('新增的是普通控件，已使用%单位（如有group父容器）或px单位（兜底）');
  }

  // 创建并执行AddControlCommand
  const command = new AddControlCommand(newControl);
  executeCommand(command);

  // 选中新创建的控件
  selectedControlIds.value = [newControl.id];
}
</script>

<style scoped>
/* Canvas样式 */
</style> 