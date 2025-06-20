<script setup lang="ts">
import { ref, computed } from 'vue';
import ControlRenderer from './ControlRenderer.vue';
import { layout, selectedControlIds, executeCommand, clearSelection } from '../store';
import { MoveControlCommand } from '../commands/MoveControlCommand';
import { AddControlCommand } from '../commands/AddControlCommand';
import { BatchMoveCommand } from '../commands/BatchMoveCommand';
import { createControl } from '../factories/controlFactory';
import type { Control } from '../types';


const canvasRef = ref<HTMLElement | null>(null);

// 按下Shift键的状态
const isShiftPressed = ref(false);
window.addEventListener('keydown', e => { if (e.key === 'Shift') isShiftPressed.value = true; });
window.addEventListener('keyup', e => { if (e.key === 'Shift') isShiftPressed.value = false; });

// 批量拖拽相关状态
const isDragging = ref(false);
const dragStartPositions = new Map<string, any>();

function handleSelect(controlId: string) {
  if (isShiftPressed.value) {
    // 按住 Shift：切换选中状态
    const index = selectedControlIds.value.indexOf(controlId);
    if (index > -1) {
      selectedControlIds.value.splice(index, 1); // 已选中则取消
    } else {
      selectedControlIds.value.push(controlId); // 未选中则添加
    }
  } else {
    // 未按 Shift 的情况
    if (selectedControlIds.value.includes(controlId)) {
      // 如果点击的是已选中的控件，保持当前选择状态（准备拖拽）
      // 不做任何改变，这样用户可以直接拖拽多选的控件
      return;
    } else {
      // 如果点击的是未选中的控件，切换到单选该控件
      selectedControlIds.value = [controlId];
    }
  }
}

function handleCanvasClick() {
  clearSelection();
}

// 处理拖拽开始事件
function handleDragStart({ controlId }: { controlId: string }) {
  if (!canvasRef.value || isDragging.value) return;
  
  isDragging.value = true;
  dragStartPositions.clear();
  
  // 如果拖拽的控件不在选中列表中，则只选中这个控件
  if (!selectedControlIds.value.includes(controlId)) {
    selectedControlIds.value = [controlId];
  }
  
  // 记录所有选中控件的初始位置
  selectedControlIds.value.forEach(id => {
    const control = findControlRecursive(layout.controlSets[layout.initialSet] || [], id);
    if (control) {
      dragStartPositions.set(id, JSON.parse(JSON.stringify(control.position)));
    }
  });
  
  console.log('批量拖拽开始，选中控件:', selectedControlIds.value.length, '个');
}

// 处理几何更新（拖拽或缩放）
function handleGeometryUpdate({ id, dx, dy, newRect, isDrag }: { id: string; dx?: number; dy?: number; newRect?: any; isDrag: boolean }) {
  if (!canvasRef.value) return;

  if (isDrag && dx !== undefined && dy !== undefined) {
    // 批量拖拽处理
    handleBatchDrag(dx, dy);
  } else if (!isDrag && newRect) {
    // 单个控件缩放处理
    handleSingleResize(id, newRect);
  }
}

// 批量拖拽处理
function handleBatchDrag(dx: number, dy: number) {
  if (!canvasRef.value || selectedControlIds.value.length === 0) return;
  
  const canvasRect = canvasRef.value.getBoundingClientRect();
  const moves: any[] = [];

  selectedControlIds.value.forEach(controlId => {
    const control = findControlRecursive(layout.controlSets[layout.initialSet] || [], controlId);
    const startPosition = dragStartPositions.get(controlId);
    
    if (control && startPosition) {
      // 计算新位置
      const newPosition = calculateDragPosition(
        { dx, dy },
        { width: canvasRect.width, height: canvasRect.height },
        startPosition
      );
      
      moves.push({
        controlId,
        oldPosition: startPosition,
        newPosition
      });
    }
  });

  if (moves.length > 0) {
    const command = new BatchMoveCommand(moves);
    executeCommand(command);
  }
  
  isDragging.value = false;
  dragStartPositions.clear();
}

// 单个控件缩放处理
function handleSingleResize(id: string, newRect: any) {
  if (!canvasRef.value) return;
  
  const control = findControlRecursive(layout.controlSets[layout.initialSet] || [], id);
  if (!control) return;

  const canvasRect = canvasRef.value.getBoundingClientRect();
  
  // 保存旧的 position 和 size 以便撤销
  const oldPosition = JSON.parse(JSON.stringify(control.position));
  const oldSize = JSON.parse(JSON.stringify(control.size));

  // 计算新的锚点
  const controlCenterX = newRect.left + newRect.width / 2;
  const controlCenterY = newRect.top + newRect.height / 2;
  const newAnchor = determineAnchor(controlCenterX, controlCenterY, { 
    left: 0, 
    top: 0, 
    width: canvasRect.width, 
    height: canvasRect.height 
  });

  // 计算新的位置和大小
  const newPosition = calculateResizePosition(newRect, { width: canvasRect.width, height: canvasRect.height }, newAnchor);
  const newSize = calculateResizeSize(newRect);

  console.log('缩放更新:', {
    控件: control.label,
    原始大小: oldSize,
    新大小: newSize,
    原始位置: oldPosition,
    新位置: newPosition
  });

  // 使用命令模式更新状态
  const command = new MoveControlCommand(id, newPosition, oldPosition, newSize, oldSize);
  executeCommand(command);
}

// 计算拖拽后的位置
function calculateDragPosition(delta: { dx: number; dy: number }, canvasRect: any, originalPosition: any) {
  console.log('计算拖拽位置:', { delta, canvasRect, originalPosition });
  
  const { anchor } = originalPosition;
  let anchorX: string, anchorY: string;
  
  if (anchor === 'center') {
    anchorX = 'center';
    anchorY = 'middle';
  } else {
    const parts = anchor.split('-');
    anchorY = parts[0];
    anchorX = parts[1];
  }

  const position: any = { anchor };

  // 处理水平位置
  if (anchorX === 'center') {
    const currentLeft = originalPosition.left || '50%';
    if (currentLeft.includes('calc')) {
      // 解析calc表达式并添加偏移
      const match = currentLeft.match(/calc\(50% \+ (.+)px\)/);
      const currentOffset = match ? parseFloat(match[1]) : 0;
      const newOffset = currentOffset + delta.dx;
      position.left = newOffset === 0 ? '50%' : `calc(50% + ${newOffset}px)`;
    } else if (currentLeft === '50%') {
      position.left = `calc(50% + ${delta.dx}px)`;
    } else {
      // 假设是像素值
      const currentPx = parseFloat(currentLeft) + canvasRect.width / 2;
      const newPx = currentPx + delta.dx;
      const offsetPx = newPx - canvasRect.width / 2;
      position.left = offsetPx === 0 ? '50%' : `calc(50% + ${offsetPx}px)`;
    }
  } else if (anchorX === 'left' && originalPosition.left !== undefined) {
    const currentLeft = parseFloat(originalPosition.left) || 0;
    position.left = `${Math.max(0, currentLeft + delta.dx)}px`;
  } else if (anchorX === 'right' && originalPosition.right !== undefined) {
    const currentRight = parseFloat(originalPosition.right) || 0;
    position.right = `${Math.max(0, currentRight - delta.dx)}px`;
  }

  // 处理垂直位置  
  if (anchorY === 'middle') {
    const currentTop = originalPosition.top || '50%';
    if (currentTop.includes('calc')) {
      const match = currentTop.match(/calc\(50% \+ (.+)px\)/);
      const currentOffset = match ? parseFloat(match[1]) : 0;
      const newOffset = currentOffset + delta.dy;
      position.top = newOffset === 0 ? '50%' : `calc(50% + ${newOffset}px)`;
    } else if (currentTop === '50%') {
      position.top = `calc(50% + ${delta.dy}px)`;
    } else {
      const currentPx = parseFloat(currentTop) + canvasRect.height / 2;
      const newPx = currentPx + delta.dy;
      const offsetPx = newPx - canvasRect.height / 2;
      position.top = offsetPx === 0 ? '50%' : `calc(50% + ${offsetPx}px)`;
    }
  } else if (anchorY === 'top' && originalPosition.top !== undefined) {
    const currentTop = parseFloat(originalPosition.top) || 0;
    position.top = `${Math.max(0, currentTop + delta.dy)}px`;
  } else if (anchorY === 'bottom' && originalPosition.bottom !== undefined) {
    const currentBottom = parseFloat(originalPosition.bottom) || 0;
    position.bottom = `${Math.max(0, currentBottom - delta.dy)}px`;
  }

  console.log('计算结果:', position);
  return position;
}

// 计算缩放后的位置（使用像素单位，与拖拽保持一致）
function calculateResizePosition(rect: any, canvasRect: any, anchor: string) {
  // 对于缩放，我们需要根据新的矩形计算绝对位置
  const position: any = { anchor };
  
  let anchorX: string, anchorY: string;
  if (anchor === 'center') {
    anchorX = 'center';
    anchorY = 'middle';
  } else {
    const parts = anchor.split('-');
    anchorY = parts[0];
    anchorX = parts[1];
  }

  // 处理水平位置
  if (anchorX === 'center') {
    const centerX = rect.left + rect.width / 2;
    const offsetPx = centerX - canvasRect.width / 2;
    position.left = offsetPx === 0 ? '50%' : `calc(50% + ${offsetPx}px)`;
  } else if (anchorX === 'left') {
    position.left = `${Math.max(0, rect.left)}px`;
  } else if (anchorX === 'right') {
    const rightDistance = canvasRect.width - rect.right;
    position.right = `${Math.max(0, rightDistance)}px`;
  }

  // 处理垂直位置
  if (anchorY === 'middle') {
    const centerY = rect.top + rect.height / 2;
    const offsetPx = centerY - canvasRect.height / 2;
    position.top = offsetPx === 0 ? '50%' : `calc(50% + ${offsetPx}px)`;
  } else if (anchorY === 'top') {
    position.top = `${Math.max(0, rect.top)}px`;
  } else if (anchorY === 'bottom') {
    const bottomDistance = canvasRect.height - rect.bottom;
    position.bottom = `${Math.max(0, bottomDistance)}px`;
  }

  return position;
}

// 计算缩放后的大小（使用像素单位）
function calculateResizeSize(rect: any) {
  return {
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };
}

// 确定锚点的函数
function determineAnchor(cx: number, cy: number, parentRect: { left: number; top: number; width: number; height: number }): string {
  const relX = (cx - parentRect.left) / parentRect.width;
  const relY = (cy - parentRect.top) / parentRect.height;
  const row = relY < 1/3 ? 'top' : (relY < 2/3 ? 'middle' : 'bottom');
  const col = relX < 1/3 ? 'left' : (relX < 2/3 ? 'center' : 'right');
  if (row === 'middle' && col === 'center') return 'center';
  if (row === 'middle') return `middle-${col}`;
  return `${row}-${col}`;
}

// 计算响应式几何属性的函数
function calculateResponsiveGeometry(
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number }, 
  parentRect: DOMRect, 
  anchor: string
) {
  const vw = (val: number) => `${(val / parentRect.width * 100).toFixed(2)}vw`;
  const vh = (val: number) => `${(val / parentRect.height * 100).toFixed(2)}vh`;

  // 限制最大尺寸，避免异常放大
  const maxWidthPx = parentRect.width * 0.8; // 最大80%宽度
  const maxHeightPx = parentRect.height * 0.8; // 最大80%高度
  
  const constrainedWidth = Math.min(rect.width, maxWidthPx);
  const constrainedHeight = Math.min(rect.height, maxHeightPx);

  // 对于较小的控件，优先使用像素单位
  const shouldUsePixels = constrainedWidth < 200 && constrainedHeight < 100;

  const newSize = shouldUsePixels ? {
    width: `${constrainedWidth}px`,
    height: `${constrainedHeight}px`,
  } : {
    width: vw(constrainedWidth),
    height: vh(constrainedHeight),
  };

  const newPosition: Record<string, any> = { anchor };

  let anchorY: string, anchorX: string;
  if (anchor === 'center') {
      anchorY = 'middle';
      anchorX = 'center';
  } else {
      const parts = anchor.split('-');
      anchorY = parts[0];
      anchorX = parts[1];
  }

  // 使用受约束的尺寸重新计算位置
  const constrainedRect = {
    ...rect,
    width: constrainedWidth,
    height: constrainedHeight,
    right: rect.left + constrainedWidth,
    bottom: rect.top + constrainedHeight
  };

  if (anchorX === 'left') newPosition.left = vw(constrainedRect.left);
  if (anchorX === 'right') newPosition.right = vw(parentRect.width - constrainedRect.right);
  if (anchorY === 'top') newPosition.top = vh(constrainedRect.top);
  if (anchorY === 'bottom') newPosition.bottom = vh(parentRect.height - constrainedRect.bottom);

  if (anchorX === 'center') newPosition.left = `calc(50% + ${vw((constrainedRect.left + constrainedRect.width / 2) - (parentRect.width / 2))})`;
  if (anchorY === 'middle') newPosition.top = `calc(50% + ${vh((constrainedRect.top + constrainedRect.height / 2) - (parentRect.height / 2))})`;

  console.log('缩放位置计算详情:', {
    原始矩形: rect,
    约束后矩形: constrainedRect,
    父容器尺寸: { width: parentRect.width, height: parentRect.height },
    使用像素单位: shouldUsePixels,
    最大尺寸限制: { maxWidth: maxWidthPx, maxHeight: maxHeightPx },
    计算结果: { newPosition, newSize },
    锚点: { anchor, anchorX, anchorY }
  });

  return { newPosition, newSize };
}

// 辅助函数，用于在复杂的层级结构中递归查找控件
function findControlRecursive(controls: Control[], id: string): Control | null {
   for (const control of controls) {
       if (control.id === id) {
           return control;
       }
       if (control.controls) {
           const found = findControlRecursive(control.controls, id);
           if (found) return found;
       }
   }
   return null;
}

// 计算属性：获取当前活动的控件列表
const activeControls = computed(() => {
    return layout.controlSets[layout.initialSet] || [];
});

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

  // 使用工厂函数创建新的控件对象
  const newControl = createControl(data.type, { x: dropX, y: dropY });

  // 创建并执行AddControlCommand
  const command = new AddControlCommand(newControl);
  executeCommand(command);

  // 选中新创建的控件
  selectedControlIds.value = [newControl.id];
}
</script>

<template>
    <div class="flex-grow p-5 flex justify-center items-center bg-gray-200">
        <div 
            class="w-[812px] h-[375px] bg-white shadow-lg relative overflow-hidden" 
            ref="canvasRef"
            @pointerdown.self="handleCanvasClick"
            @dragover="handleDragOver"
            @drop="handleDrop"
        >
            <!-- 循环渲染所有控件 -->
            <ControlRenderer
                v-for="control in activeControls"
                :key="control.id"
                :control="control"
                :is-selected="selectedControlIds.includes(control.id)"
                :is-primary-selected="selectedControlIds[0] === control.id"
                @select="handleSelect"
                @drag-start="handleDragStart"
                @update-geometry="handleGeometryUpdate"
            />
        </div>
    </div>
</template>