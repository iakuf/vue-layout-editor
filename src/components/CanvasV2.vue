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
      <!-- 循环渲染所有控件 - 先渲染组控件，再渲染普通控件 -->
      <!-- 组控件在下层 -->
      <component
        v-for="control in activeControls.filter(c => c.type === 'group')"
        :key="control.id"
        :is="GroupRenderer"
        :control="control"
        :is-selected="selectedControlIds.includes(control.id)"
        :is-primary-selected="selectedControlIds[0] === control.id"
        :selected-control-ids="selectedControlIds"
        @select="handleSelect"
        @update-geometry="handleGeometryUpdate"
        @control-drop="handleControlDrop"
      />
      
      <!-- 普通控件在上层 -->
      <component
        v-for="control in activeControls.filter(c => c.type !== 'group')"
        :key="control.id"
        :is="ControlRenderer"
        :control="control"
        :is-selected="selectedControlIds.includes(control.id)"
        :is-primary-selected="selectedControlIds[0] === control.id"
        :selected-control-ids="selectedControlIds"
        @select="handleSelect"
        @update-geometry="handleGeometryUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import type { Control } from '../types';
import { layout, executeCommand, selectedControlIds } from '../store';
import { createControl } from '../factories/controlFactory';
import { AddControlCommand } from '../commands/AddControlCommand';
import { ResizeControlCommand } from '../commands/ResizeControlCommand';
import { MoveToGroupCommand } from '../commands/MoveToGroupCommand';
import GroupRenderer from './GroupRenderer.vue';
import ControlRenderer from './ControlRendererV3.vue';
// 编辑器内部统一使用 px 单位，只在导入导出时转换

const canvasRef = ref<HTMLElement>();

// 🔍 调试：检查组件导入
console.log('🔍 CanvasV2 组件导入检查:', {
  GroupRenderer: !!GroupRenderer,
  ControlRenderer: !!ControlRenderer,
  ControlRendererName: ControlRenderer.name || ControlRenderer.__name
});

// 计算属性：获取当前活动的控件列表
const activeControls = computed(() => {
  const currentSet = layout.controlSets[layout.initialSet] || [];
  
  // 🔍 调试：打印所有控件信息
  console.log('🔍 activeControls 计算:', {
    总控件数: currentSet.length,
    控件列表: currentSet.map(c => ({ id: c.id, type: c.type, label: c.label }))
  });
  
  // 🔍 调试：分别打印组控件和普通控件
  const groupControls = currentSet.filter(c => c.type === 'group');
  const normalControls = currentSet.filter(c => c.type !== 'group');
  
  console.log('🔍 控件分类:', {
    组控件数量: groupControls.length,
    组控件: groupControls.map(c => ({ id: c.id, type: c.type, label: c.label })),
    普通控件数量: normalControls.length,
    普通控件: normalControls.map(c => ({ id: c.id, type: c.type, label: c.label }))
  });
  
  return currentSet;
});

// 🔍 调试：监视activeControls变化和渲染状态
watch(activeControls, (newControls) => {
  console.log('🔍 activeControls 变化监听:', {
    总数: newControls.length,
    组控件: newControls.filter(c => c.type === 'group').map(c => c.label),
    普通控件: newControls.filter(c => c.type !== 'group').map(c => c.label),
    完整列表: newControls.map(c => ({ id: c.id, type: c.type, label: c.label }))
  });
}, { immediate: true, deep: true });

// 🔍 调试：监视selectedControlIds变化
watch(selectedControlIds, (newIds) => {
  console.log('🔍 selectedControlIds 变化:', newIds);
}, { immediate: true });

// 递归查找控件
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

// 在所有层级中查找控件
function findControlInAllLevels(id: string): Control | null {
  for (const key in layout.controlSets) {
    const found = findControlRecursive(layout.controlSets[key], id);
    if (found) return found;
  }
  return null;
}

// 查找控件的父组（如果存在）
function findControlParentGroup(controlId: string): Control | null {
  // 递归查找控件的父组
  function findParentGroupRecursive(controls: Control[], targetId: string): Control | null {
    for (const control of controls) {
      if (control.type === 'group' && control.controls) {
        // 检查目标控件是否直接在这个组内
        if (control.controls.find(c => c.id === targetId)) {
          return control;
        }
        // 递归查找子组
        const found = findParentGroupRecursive(control.controls, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  for (const key in layout.controlSets) {
    const found = findParentGroupRecursive(layout.controlSets[key], controlId);
    if (found) return found;
  }
  return null;
}

// 检测拖拽入组
function detectTargetGroup(controlRect: { left: number; top: number; width: number; height: number }, draggedControlId: string): { targetGroup: Control; relativePosition: any } | null {
  if (!canvasRef.value) return null;

  // 🔧 检查控件当前是否已经在某个组内
  const currentParentGroup = findControlParentGroup(draggedControlId);

  // 计算控件中心点
  const centerX = controlRect.left + controlRect.width / 2;
  const centerY = controlRect.top + controlRect.height / 2;

  // 遍历所有组控件
  for (const control of activeControls.value) {
    if (control.type === 'group' && control.id !== draggedControlId) {
      const groupElement = canvasRef.value.querySelector(`[data-id='${control.id}']`) as HTMLElement;
      if (!groupElement) continue;

      const canvasRect = canvasRef.value.getBoundingClientRect();
      const groupRect = groupElement.getBoundingClientRect();

      // 转换为相对于画布的坐标
      const groupLeft = groupRect.left - canvasRect.left;
      const groupTop = groupRect.top - canvasRect.top;
      const groupRight = groupRect.right - canvasRect.left;
      const groupBottom = groupRect.bottom - canvasRect.top;

      // 检测控件中心是否在组内
      const isInGroup = centerX >= groupLeft && centerX <= groupRight &&
                       centerY >= groupTop && centerY <= groupBottom;

      if (isInGroup) {
        // 🔧 如果控件已经在当前检测到的组内，则不返回入组信息
        if (currentParentGroup && currentParentGroup.id === control.id) {
          console.log(`🔄 控件 ${draggedControlId} 在组 ${control.label} 内移动，跳过入组检测`);
          return null; // 返回null表示不需要入组，这是组内移动
        }

        // 计算相对于组内容区域的位置（减去标题栏高度32px）
        const relativeX = controlRect.left - groupLeft;
        const relativeY = controlRect.top - groupTop - 32; // 32px是标题栏高度

        const relativePosition = {
          left: `${Math.max(0, relativeX)}px`,
          top: `${Math.max(0, relativeY)}px`,
          anchor: 'top-left'
        };

        console.log('🎯 检测到拖拽入组:', {
          目标组: control.label,
          控件位置: controlRect,
          当前父组: currentParentGroup?.label || '无',
          组边界: { left: groupLeft, top: groupTop, right: groupRight, bottom: groupBottom },
          相对位置: relativePosition
        });

        return { targetGroup: control, relativePosition };
      }
    }
  }

  return null;
}

// 状态管理：是否正在进行控件移动操作
const isMovingControl = ref(false);

// 处理控件选择
function handleSelect(controlId: string) {
  console.log('🎯 选择控件:', controlId);
  
  // 🔧 如果正在移动控件，忽略选择事件
  if (isMovingControl.value) {
    console.log('⚠️ 正在移动控件，忽略选择事件');
    return;
  }
  
  // 🔧 安全检查：确保要选择的控件确实存在
  const control = findControlInAllLevels(controlId);
  if (!control) {
    console.warn(`⚠️ 尝试选择不存在的控件: ${controlId}`);
    return;
  }
  
  // 🔧 检查控件是否在组内，如果是组内控件，选择其父组
  const parentGroup = findControlParentGroup(controlId);
  if (parentGroup) {
    console.log(`🔗 控件 ${controlId} 在组 ${parentGroup.label} 内，选择父组`);
    // 🔧 使用nextTick确保DOM稳定后再更新选择状态
    nextTick(() => {
      selectedControlIds.value = [parentGroup.id];
    });
  } else {
    // 🔧 使用nextTick确保DOM稳定后再更新选择状态
    nextTick(() => {
      selectedControlIds.value = [controlId];
    });
  }
}

// 处理画布点击（取消选择）
function handleCanvasClick() {
  console.log('🖱️ 画布点击 - 取消选择');
  selectedControlIds.value = [];
}

// 全局调试功能
function debugControlsState() {
  console.log('=== 🔍 全局控件状态检查 ===');
  
  // 检查顶层控件
  const topLevelControls = layout.controlSets[layout.initialSet] || [];
  console.log('顶层控件:', topLevelControls.map(c => ({
    id: c.id,
    label: c.label,
    type: c.type,
    子控件数: c.controls?.length || 0
  })));
  
  // 检查所有组内控件
  topLevelControls.forEach(control => {
    if (control.type === 'group' && control.controls) {
      console.log(`组 "${control.label}" 内的控件:`, control.controls.map(c => ({
        id: c.id,
        label: c.label,
        type: c.type
      })));
    }
  });
  
  // 检查选中状态
  console.log('当前选中:', selectedControlIds.value);
  
  console.log('=== 状态检查完成 ===');
}

// 暴露调试功能到全局
if (typeof window !== 'undefined') {
  (window as any).debugControls = debugControlsState;
}

// 处理几何更新（拖拽或缩放）
function handleGeometryUpdate({ id, newRect, isDrag }: { 
  id: string; 
  newRect: any; 
  isDrag: boolean;
}) {
  console.log(`🔄 几何更新 (${isDrag ? '拖拽' : '缩放'}):`, { id, newRect });
  if (!canvasRef.value) return;

  try {
    // 如果是拖拽，检测是否拖入组内
    if (isDrag) {
      const targetGroupInfo = detectTargetGroup(newRect, id);
      
      if (targetGroupInfo) {
        const { targetGroup, relativePosition } = targetGroupInfo;
        
        console.log(`✅ 准备将控件移入组`, {
          控件ID: id,
          目标组: targetGroup.label,
          组内现有控件数: targetGroup.controls?.length || 0
        });
        
        // 🔧 修复：立即停止所有交互和选择，确保DOM状态稳定
        selectedControlIds.value = [];
        isMovingControl.value = true; // 🔧 设置移动标志
        
        // 🔧 添加调试信息：检查移动前的状态
        const controlBeforeMove = findControlInAllLevels(id);
        const parentBeforeMove = findControlParentGroup(id);
        console.log('🔍 移动前状态检查:', {
          控件存在: !!controlBeforeMove,
          当前父组: parentBeforeMove?.label || '顶层',
          控件标签: controlBeforeMove?.label
        });
        
        // 延迟执行移动命令，确保当前拖拽完全结束
        setTimeout(() => {
          try {
            const command = new MoveToGroupCommand(id, targetGroup.id, relativePosition);
            executeCommand(command);
            
            console.log(`✅ 控件已成功移入组 ${targetGroup.label}`);
            
            // 🔧 添加调试信息：检查移动后的状态
            const controlAfterMove = findControlInAllLevels(id);
            const parentAfterMove = findControlParentGroup(id);
            console.log('🔍 移动后状态检查:', {
              控件存在: !!controlAfterMove,
              新父组: parentAfterMove?.label || '顶层',
              目标组子控件数: targetGroup.controls?.length || 0
            });
            
            // 在移动成功后选择目标组
            nextTick(() => {
              selectedControlIds.value = [targetGroup.id];
              isMovingControl.value = false; // 🔧 清除移动标志
            });
            
          } catch (error) {
            console.error('移入组失败:', error);
            isMovingControl.value = false; // 🔧 出错时也要清除移动标志
          }
        }, 50); // 50ms延迟确保所有拖拽事件完成
        
        return; // 避免执行普通的位置更新
      }
    }

    // 普通的位置/尺寸更新（包括组内移动）
    const command = new ResizeControlCommand(id, {
      // 尺寸更新
      width: newRect.width,
      height: newRect.height,
      
      // 位置更新
      left: newRect.left,
      top: newRect.top,
      
      // 锚点标准化
      anchor: 'top-left'
    });

    executeCommand(command);
    console.log(`✅ ${isDrag ? '拖拽' : '缩放'}命令执行成功`);
  } catch (error) {
    console.error(`❌ ${isDrag ? '拖拽' : '缩放'}命令执行失败:`, error);
  }
}

// 处理GroupRenderer发送的控件入组事件
function handleControlDrop({ groupId, controlId, relativePosition }: { 
  groupId: string; 
  controlId: string; 
  relativePosition: any 
}) {
  console.log('📥 接收到控件入组事件:', { groupId, controlId, relativePosition });
  
  // 🔧 修复：立即清空选择状态，避免Vue组件引用冲突
  selectedControlIds.value = [];
  isMovingControl.value = true; // 🔧 设置移动标志
  
  // 🔧 添加调试信息：检查移动前的状态
  const controlBeforeMove = findControlInAllLevels(controlId);
  const parentBeforeMove = findControlParentGroup(controlId);
  console.log('🔍 拖放入组前状态检查:', {
    控件存在: !!controlBeforeMove,
    当前父组: parentBeforeMove?.label || '顶层',
    目标组: groupId
  });
  
  try {
    const command = new MoveToGroupCommand(controlId, groupId, relativePosition);
    executeCommand(command);
    
    console.log(`✅ 控件 ${controlId} 已成功移入组 ${groupId}`);
    
    // 🔧 添加调试信息：检查移动后的状态
    const controlAfterMove = findControlInAllLevels(controlId);
    const parentAfterMove = findControlParentGroup(controlId);
    console.log('🔍 拖放入组后状态检查:', {
      控件存在: !!controlAfterMove,
      新父组: parentAfterMove?.label || '顶层'
    });
    
    // 🔧 修复：在命令执行完成后再设置选择状态
    nextTick(() => {
      selectedControlIds.value = [groupId];
      isMovingControl.value = false; // 🔧 清除移动标志
    });
  } catch (error) {
    console.error('控件入组失败:', error);
    isMovingControl.value = false; // 🔧 出错时也要清除移动标志
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
#layout-canvas {
  /* 确保容器稳定，防止子元素interact时影响布局 */
  position: relative;
  contain: layout style paint; /* CSS Containment：隔离布局计算 */
  transform: translateZ(0); /* 强制创建新的层叠上下文 */
  will-change: auto; /* 避免不必要的合成层 */
}

/* 确保所有子元素的绝对定位不影响容器和兄弟元素 */
#layout-canvas > * {
  position: absolute;
  transform-style: preserve-3d; /* 保持3D变换空间独立 */
}
</style> 