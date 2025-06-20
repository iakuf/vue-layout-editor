<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import ControlRenderer from './ControlRenderer.vue';
import { layout, selectedControlIds, executeCommand, clearSelection } from '../store';
import { MoveControlCommand } from '../commands/MoveControlCommand';
import { AddControlCommand } from '../commands/AddControlCommand';
import { BatchMoveCommand } from '../commands/BatchMoveCommand';
import { MoveToGroupCommand } from '../commands/MoveToGroupCommand';
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
  
  const draggedControl = findControlInAllLevels(controlId);
  if (!draggedControl) return;
  
  console.log('🚀 拖拽开始分析:', {
    拖拽控件: draggedControl.label,
    拖拽控件类型: draggedControl.type,
    当前选中: selectedControlIds.value,
    拖拽控件是否被选中: selectedControlIds.value.includes(controlId)
  });
  
  // 如果拖拽的是组控件，确保只移动组控件本身，不包括子控件
  if (draggedControl.type === 'group') {
    console.log('📦 拖拽组控件 - 只移动组本身');
    selectedControlIds.value = [controlId];
  } else {
    // 如果拖拽的控件不在选中列表中，则只选中这个控件
    if (!selectedControlIds.value.includes(controlId)) {
      selectedControlIds.value = [controlId];
    }
  }
  
  // 记录所有选中控件的初始位置
  selectedControlIds.value.forEach(id => {
    const control = findControlInAllLevels(id);
    if (control) {
      dragStartPositions.set(id, JSON.parse(JSON.stringify(control.position)));
      console.log(`💾 保存控件 ${control.label} 初始位置:`, control.position);
    } else {
      console.warn(`⚠️ 找不到控件 ${id}`);
    }
  });
  
  console.log('🎯 拖拽状态设置完成:', {
    最终选中: selectedControlIds.value,
    保存的位置数量: dragStartPositions.size
  });
}

// 在所有层级中查找控件
function findControlInAllLevels(id: string): Control | null {
  for (const key in layout.controlSets) {
    const found = findControlRecursive(layout.controlSets[key], id);
    if (found) return found;
  }
  return null;
}

// 处理几何更新（拖拽或缩放）
function handleGeometryUpdate({ id, dx, dy, newRect, isDrag }: { 
  id: string; 
  dx?: number; 
  dy?: number; 
  newRect?: any; 
  isDrag: boolean;
}) {
  if (!canvasRef.value) return;

  console.log('🔄 handleGeometryUpdate 被调用:', {
    id,
    isDrag,
    dx,
    dy,
    控件: findControlInAllLevels(id)?.label
  });

  if (isDrag && dx !== undefined && dy !== undefined) {
    // 检查是否拖入组内
    const draggedControl = findControlById(id);
    if (!draggedControl) return;
    
    // 计算拖拽后的新位置
    const startPosition = dragStartPositions.get(id);
    if (!startPosition) {
      console.log(`❌ 没有找到控件 ${id} 的起始位置，尝试使用当前位置`);
      // 如果没有起始位置，使用控件的当前位置
      const currentPosition = draggedControl.position;
      if (currentPosition) {
        dragStartPositions.set(id, JSON.parse(JSON.stringify(currentPosition)));
        console.log(`💾 补充保存控件 ${draggedControl.label} 的当前位置:`, currentPosition);
      } else {
        console.error(`❌ 控件 ${id} 没有有效的位置信息`);
        return;
      }
    }
    
          const canvasRect = canvasRef.value.getBoundingClientRect();
      // 获取最新的startPosition（可能在上面被补充保存了）
      const finalStartPosition = dragStartPositions.get(id);
      if (!finalStartPosition) {
        console.error(`❌ 仍然无法获取控件 ${id} 的位置信息`);
        return;
      }
      
      const newPosition = calculateDragPosition(
        { dx, dy },
        { width: canvasRect.width, height: canvasRect.height },
        finalStartPosition
      );
    
    // 根据控件的新位置计算鼠标位置
    // 假设鼠标位置是控件中心（这是一个合理的近似）
    let mouseX = 0;
    let mouseY = 0;
    

    
    // 解析新位置来计算鼠标坐标
    if (newPosition.left) {
      if (typeof newPosition.left === 'string') {
        if (newPosition.left.includes('calc')) {
          const match = newPosition.left.match(/calc\(50% \+ (.+)px\)/);
          const offset = match ? parseFloat(match[1]) : 0;
          mouseX = canvasRect.width / 2 + offset;
        } else if (newPosition.left.includes('%')) {
          const percent = parseFloat(newPosition.left);
          mouseX = canvasRect.width * percent / 100;
        } else {
          mouseX = parseFloat(newPosition.left);
        }
      }
    } else if (newPosition.right) {
      // 处理right定位
      if (typeof newPosition.right === 'string') {
        const rightValue = parseFloat(newPosition.right);
        mouseX = canvasRect.width - rightValue;
      }
    }
    
    if (newPosition.top) {
      if (typeof newPosition.top === 'string') {
        if (newPosition.top.includes('calc')) {
          const match = newPosition.top.match(/calc\(50% \+ (.+)px\)/);
          const offset = match ? parseFloat(match[1]) : 0;
          mouseY = canvasRect.height / 2 + offset;
        } else if (newPosition.top.includes('%')) {
          const percent = parseFloat(newPosition.top);
          mouseY = canvasRect.height * percent / 100;
        } else {
          mouseY = parseFloat(newPosition.top);
        }
      }
    } else if (newPosition.bottom) {
      // 处理bottom定位
      if (typeof newPosition.bottom === 'string') {
        const bottomValue = parseFloat(newPosition.bottom);
        mouseY = canvasRect.height - bottomValue;
      }
    }
    
    console.log('🧮 鼠标位置:', { x: mouseX, y: mouseY });
    
    // 使用计算出的鼠标位置检测目标组
    const targetGroup = detectTargetGroup(mouseX, mouseY, id);
    
    console.log('🔍 检测结果:', targetGroup ? `找到目标组: ${targetGroup.label}` : '没有找到目标组');
    
    if (targetGroup) {
      console.log(`🎯 检测到拖入组: ${targetGroup.label}`);
      
      // 计算相对于组的位置
      const groupElem = canvasRef.value.querySelector(`[data-id='${targetGroup.id}']`) as HTMLElement;
      if (groupElem) {
        const groupRect = groupElem.getBoundingClientRect();
        const relativePosition = calculateRelativePosition(newPosition, groupRect, canvasRect);
        
        try {
          // 检查控件是否已经在同一个组内（避免重复添加到同一组）
          if (targetGroup.controls && targetGroup.controls.find(c => c.id === id)) {
            console.log(`⚠️ 控件 ${id} 已经在组 ${targetGroup.id} 内，跳过移动`);
            return;
          }
          
          console.log(`✅ 准备将控件添加到组内`, {
            控件ID: id,
            目标组: targetGroup.label,
            组内现有控件数: targetGroup.controls?.length || 0,
            组内现有控件: targetGroup.controls?.map(c => c.label) || []
          });
          
          // 使用nextTick确保在下一个tick执行，避免响应式更新冲突
          nextTick(() => {
            try {
              // 执行"移动到组"的命令
              const command = new MoveToGroupCommand(id, targetGroup.id, relativePosition);
              executeCommand(command);
              
              // 更新选中状态：选中目标组和移入的控件
              selectedControlIds.value = [targetGroup.id, id];
              
              console.log(`✅ 控件 ${draggedControl.label} 已成功移入组 ${targetGroup.label}`);
            } catch (error) {
              console.error('移入组失败:', error);
            }
          });
        } catch (error) {
          console.error('移入组失败:', error);
          // 如果移入组失败，回退到普通的批量移动
          handleBatchDrag(dx, dy);
        }
      }
    } else {
      // 没有拖入组，执行原来的批量拖拽处理
      handleBatchDrag(dx, dy);
    }
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
    const control = findControlInAllLevels(controlId);
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
      
      console.log(`📦 准备移动控件 ${control.label}:`, {
        旧位置: startPosition,
        新位置: newPosition,
        是否为组: control.type === 'group',
        子控件数: control.controls?.length || 0
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
  
  const control = findControlInAllLevels(id);
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

// 根据ID查找控件（使用统一的查找函数）
function findControlById(id: string): Control | null {
    return findControlInAllLevels(id);
}

// 检测是否拖入组内
function detectTargetGroup(mouseX: number, mouseY: number, draggedControlId: string): Control | null {
    if (!canvasRef.value) return null;
    
    // mouseX和mouseY是相对于画布的坐标，不需要额外转换
    // 遍历所有组控件，检查是否拖入其中
    for (const control of activeControls.value) {
        if (control.type === 'group' && control.id !== draggedControlId) {
            console.log('🔍 检查组控件:', control.label);
            
            const groupElem = canvasRef.value.querySelector(`[data-id='${control.id}']`) as HTMLElement;
            if (!groupElem) {
              console.log('❌ 未找到组的DOM元素');
              continue;
            }
            
            const canvasRect = canvasRef.value.getBoundingClientRect();
            const groupRect = groupElem.getBoundingClientRect();
            
            // 将组的屏幕坐标转换为相对于画布的坐标
            const groupLeft = groupRect.left - canvasRect.left;
            const groupTop = groupRect.top - canvasRect.top;
            const groupRight = groupRect.right - canvasRect.left;
            const groupBottom = groupRect.bottom - canvasRect.top;
            
            console.log('📐 边界检测:', {
              组边界: { left: groupLeft, top: groupTop, right: groupRight, bottom: groupBottom },
              鼠标位置: { x: mouseX, y: mouseY },
              组内子控件数: control.controls?.length || 0
            });
            
            // 扩大检测区域，特别是标题栏区域
            const titleBarHeight = 30; // 标题栏大约高度
            const expandedGroupTop = groupTop; // 标题栏从顶部开始
            const expandedGroupBottom = groupBottom;
            
            // 检测是否在组的范围内（包括标题栏）
            const inGroup = mouseX >= groupLeft && mouseX <= groupRight &&
                          mouseY >= expandedGroupTop && mouseY <= expandedGroupBottom;
                          
            // 额外检测：如果鼠标在标题栏区域，也认为是在组内
            const inTitleBar = mouseX >= groupLeft && mouseX <= groupRight &&
                             mouseY >= groupTop && mouseY <= (groupTop + titleBarHeight);
            
            const finalResult = inGroup || inTitleBar;
                          
            console.log('✅ 碰撞结果:', {
              基本检测: inGroup ? '在组内' : '不在组内',
              标题栏检测: inTitleBar ? '在标题栏' : '不在标题栏',
              最终结果: finalResult ? '命中' : '未命中'
            });
            
            if (finalResult) {
                console.log(`🎉 找到目标组: ${control.label}`);
                return control;
            }
        }
    }
    
    console.log('❌ 没有找到任何目标组');
    return null;
}

// 计算控件相对于组的位置
function calculateRelativePosition(
    absolutePosition: any, 
    groupRect: DOMRect, 
    canvasRect: DOMRect
): any {
    // 将画布坐标转换为相对于组的坐标
    const groupLeft = groupRect.left - canvasRect.left;
    const groupTop = groupRect.top - canvasRect.top;
    
    // 获取控件在画布上的绝对位置（像素值）
    let controlLeft = 0;
    let controlTop = 0;
    
    // 解析控件的当前位置
    if (absolutePosition.left) {
        if (typeof absolutePosition.left === 'string') {
            if (absolutePosition.left.includes('calc')) {
                // 处理 calc(50% + Npx) 格式
                const match = absolutePosition.left.match(/calc\(50% \+ (.+)px\)/);
                const offset = match ? parseFloat(match[1]) : 0;
                controlLeft = canvasRect.width / 2 + offset;
            } else if (absolutePosition.left.includes('%')) {
                // 处理百分比
                const percent = parseFloat(absolutePosition.left);
                controlLeft = canvasRect.width * percent / 100;
            } else {
                // 处理像素值
                controlLeft = parseFloat(absolutePosition.left);
            }
        }
    }
    
    if (absolutePosition.top) {
        if (typeof absolutePosition.top === 'string') {
            if (absolutePosition.top.includes('calc')) {
                // 处理 calc(50% + Npx) 格式
                const match = absolutePosition.top.match(/calc\(50% \+ (.+)px\)/);
                const offset = match ? parseFloat(match[1]) : 0;
                controlTop = canvasRect.height / 2 + offset;
            } else if (absolutePosition.top.includes('%')) {
                // 处理百分比
                const percent = parseFloat(absolutePosition.top);
                controlTop = canvasRect.height * percent / 100;
            } else {
                // 处理像素值
                controlTop = parseFloat(absolutePosition.top);
            }
        }
    }
    
    // 计算相对于组的位置
    const relativeLeft = controlLeft - groupLeft;
    const relativeTop = controlTop - groupTop;
    
    // 确保位置不为负数
    const finalLeft = Math.max(0, relativeLeft);
    const finalTop = Math.max(0, relativeTop);
    
    console.log('位置计算详情:', {
        绝对位置: absolutePosition,
        控件在画布上的位置: { left: controlLeft, top: controlTop },
        组在画布上的位置: { left: groupLeft, top: groupTop },
        相对位置: { left: finalLeft, top: finalTop }
    });
    
    return {
        anchor: 'top-left',
        left: `${finalLeft}px`,
        top: `${finalTop}px`
    };
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
                :selected-control-ids="selectedControlIds"
                @select="handleSelect"
                @drag-start="handleDragStart"
                @update-geometry="handleGeometryUpdate"
            />
        </div>
    </div>
</template>