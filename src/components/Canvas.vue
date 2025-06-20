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
    // 未按 Shift：只选中当前点击的
    selectedControlIds.value = [controlId];
  }
}

function handleCanvasClick() {
  clearSelection();
}

// 拖拽多个控件时，只处理一次
let batchMoveData: any[] = [];
function handleBatchGeometryUpdate({ id, newRect, isDrag }: { id: string; newRect: any; isDrag: boolean }) {
  if (!isDrag) return; // 批量操作暂时只支持拖拽

  const control = findControlRecursive(layout.controlSets[layout.initialSet] || [], id);
  if (!control) return;

  const canvasRect = canvasRef.value!.getBoundingClientRect();
  const newPosition = calculateDragPosition(newRect, { width: canvasRect.width, height: canvasRect.height }, control.position.anchor);

  batchMoveData.push({
      controlId: id,
      newPosition,
      oldPosition: control.position,
  });

  // 如果所有选中的控件都已更新，则执行命令
  if (batchMoveData.length === selectedControlIds.value.length) {
      const command = new BatchMoveCommand(batchMoveData);
      executeCommand(command);
      batchMoveData = []; // 清空临时数据
  }
}

function handleDragOver(event: DragEvent) {
  // 必须阻止默认行为，才能触发drop事件
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

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



const activeControls = computed(() => {
    return layout.controlSets[layout.initialSet] || [];
});

// 当ControlRenderer更新后，执行核心转换逻辑
function handleGeometryUpdate({ id, newRect, isDrag }: { id: string; newRect: any; isDrag: boolean }) {
  if (!canvasRef.value) return;

  // 使用递归查找，确保能找到嵌套的控件
  let control: Control | null = null;
  for (const key in layout.controlSets) {
      control = findControlRecursive(layout.controlSets[key], id);
      if (control) break;
  }
  if (!control) return;

  const canvasRect = canvasRef.value.getBoundingClientRect();

  // 边界检查：确保控件不会完全移出画布
  const constrainedRect = {
    left: Math.max(0, Math.min(newRect.left, canvasRect.width - newRect.width)),
    top: Math.max(0, Math.min(newRect.top, canvasRect.height - newRect.height)),
    width: newRect.width,
    height: newRect.height,
    right: 0,
    bottom: 0
  };
  constrainedRect.right = constrainedRect.left + constrainedRect.width;
  constrainedRect.bottom = constrainedRect.top + constrainedRect.height;

  console.log('边界检查结果:', {
    原始位置: newRect,
    约束后位置: constrainedRect,
    画布尺寸: { width: canvasRect.width, height: canvasRect.height }
  });

  // 保存旧的 position 和 size 以便撤销
  const oldPosition = JSON.parse(JSON.stringify(control.position));
  const oldSize = JSON.parse(JSON.stringify(control.size));

  let newPosition, newSize;

  if (isDrag) {
    // 拖拽操作：保持原有锚点，只更新对应的位置值
    newPosition = calculateDragPosition(constrainedRect, { width: canvasRect.width, height: canvasRect.height }, oldPosition.anchor);
    newSize = oldSize; // 保持原来的大小

    console.log('拖拽更新:', {
      原始位置: oldPosition,
      新位置: newPosition,
      大小保持不变: newSize,
      原始矩形: newRect,
      约束后矩形: constrainedRect
    });
  } else {
    // 缩放操作：可以重新计算锚点，但对于大小使用像素单位保持一致性
    const controlCenterX = newRect.left + newRect.width / 2;
    const controlCenterY = newRect.top + newRect.height / 2;

    const newAnchor = determineAnchor(controlCenterX, controlCenterY, { 
      left: 0, 
      top: 0, 
      width: canvasRect.width, 
      height: canvasRect.height 
    });

    // 对于缩放，使用混合策略：位置用像素（类似拖拽），大小也用像素
    newPosition = calculateResizePosition(newRect, { width: canvasRect.width, height: canvasRect.height }, newAnchor);
    newSize = calculateResizeSize(newRect, { width: canvasRect.width, height: canvasRect.height });

    console.log('缩放更新:', {
      原始大小: oldSize,
      新大小: newSize,
      原始位置: oldPosition,
      新位置: newPosition,
      新锚点: newAnchor
    });
  }

  // 使用命令模式更新状态
  const command = new MoveControlCommand(id, newPosition, oldPosition, newSize, oldSize);
  executeCommand(command);
}

// 拖拽时的位置计算函数（保持原有锚点）
function calculateDragPosition(rect: any, canvasRect: any, anchor: string) {
  console.log('计算拖拽位置:', { rect, canvasRect, anchor });
  
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

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

  // 清除所有可能的位置属性
  position.left = undefined;
  position.right = undefined;
  position.top = undefined;
  position.bottom = undefined;

  // 处理水平位置
  if (anchorX === 'center') {
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
    const offsetPx = centerY - canvasRect.height / 2;
    position.top = offsetPx === 0 ? '50%' : `calc(50% + ${offsetPx}px)`;
  } else if (anchorY === 'top') {
    position.top = `${Math.max(0, rect.top)}px`;
  } else if (anchorY === 'bottom') {
    const bottomDistance = canvasRect.height - rect.bottom;
    position.bottom = `${Math.max(0, bottomDistance)}px`;
  }

  // 移除undefined属性
  Object.keys(position).forEach(key => {
    if (position[key] === undefined) {
      delete position[key];
    }
  });

  console.log('计算结果:', position);
  return position;
}

// 计算缩放后的位置（使用像素单位，与拖拽保持一致）
function calculateResizePosition(rect: any, canvasRect: any, anchor: string) {
  return calculateDragPosition(rect, canvasRect, anchor);
}

// 计算缩放后的大小（使用像素单位）
function calculateResizeSize(rect: any, canvasRect: any) {
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
                @update-geometry="handleGeometryUpdate"
            />
        </div>
    </div>
</template>