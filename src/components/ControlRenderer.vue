<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import interact from 'interactjs';
import type { Control } from '../types';


const props = defineProps<{
  control: Control;
  isSelected: boolean;       // 是否被选中
  isPrimarySelected: boolean; // 是否是主选中对象
  selectedControlIds?: string[]; // 传递所有选中的控件ID
}>();

const emit = defineEmits(['select', 'update-geometry', 'drag-start', 'drag-end']);

const controlRef = ref<HTMLElement | null>(null);
const isInteracting = ref(false);

// 检查子控件是否被选中
// 组控件相关的函数已移动到 GroupRenderer.vue

const styleObject = computed(() => {
  const style: Record<string, any> = {};
  const { position, size } = props.control;

  const toCssValue = (value: any) => {
    if (typeof value === 'object' && value !== null && 'preferred' in value) {
      const { min = '0px', preferred, max = '100vw' } = value;
      return `clamp(${min}, ${preferred}, ${max})`;
    }
    return value;
  };

  if (size.width) style.width = toCssValue(size.width);
  if (size.height) style.height = toCssValue(size.height);
  if (size.aspectRatio) style.aspectRatio = size.aspectRatio;

  let anchorY, anchorX;
  if (position.anchor === 'center') {
      anchorY = 'middle';
      anchorX = 'center';
  } else {
      const parts = position.anchor.split('-');
      anchorY = parts[0];
      anchorX = parts[1];
  }

  // 清理之前的位置和变换
  let transforms: string[] = [];

  // 清理之前的位置属性
  style.left = '';
  style.right = '';
  style.top = '';
  style.bottom = '';

  // 设置水平位置
  if (anchorX === 'left' && position.left !== undefined) {
    style.left = toCssValue(position.left);
  } else if (anchorX === 'right' && position.right !== undefined) {
    style.right = toCssValue(position.right);
  } else if (anchorX === 'center') {
    style.left = position.left ? toCssValue(position.left) : '50%';
    transforms.push('translateX(-50%)');
  } else {
    // Fallback: 如果没有有效的水平位置，使用left: 0
    style.left = '0px';
  }

  // 设置垂直位置
  if (anchorY === 'top' && position.top !== undefined) {
    style.top = toCssValue(position.top);
  } else if (anchorY === 'bottom' && position.bottom !== undefined) {
    style.bottom = toCssValue(position.bottom);
  } else if (anchorY === 'middle') {
    style.top = position.top ? toCssValue(position.top) : '50%';
    transforms.push('translateY(-50%)');
  } else {
    // Fallback: 如果没有有效的垂直位置，使用top: 0
    style.top = '0px';
  }

  // 应用变换
  if (transforms.length > 0) {
    style.transform = transforms.join(' ');
  }

  if (props.control.style) {
    Object.assign(style, props.control.style);
  }

  console.log('控件样式计算:', {
    控件ID: props.control.id,
    位置数据: position,
    解析的锚点: { anchorX, anchorY },
    计算样式: style
  });

  return style;
});

function handlePointerDown(event: PointerEvent) {
    // 只选择控件，不阻止interact.js的事件
    emit('select', props.control.id);
}

// 简化interact.js初始化逻辑
onMounted(() => {
  if (controlRef.value) {
    const element = controlRef.value;
    
    interact(element)
      .draggable({
        listeners: { 
          start: handleDragStart,
          move: handleDragMove,
          end: handleDragEnd
        },
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: 'parent'
          })
        ]
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: { 
          move: handleResizeMove,
          start: handleResizeStart,
          end: handleResizeEnd
        },
        modifiers: [
          interact.modifiers.restrictEdges({
            outer: 'parent'
          }),
        ]
      });
  }
});

function handleDragStart(event: any) {
  isInteracting.value = true;
  const target = event.target;
  
  // 记录初始变换状态
  const initialTransform = target.style.transform || '';
  target.setAttribute('data-initial-transform', initialTransform);
  
  console.log('开始拖拽:', props.control.label);
  
  emit('drag-start', { controlId: props.control.id, event });
}

function handleDragMove(event: any) {
    const target = event.target;
    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

    // 获取基础transform
    const initialTransform = target.getAttribute('data-initial-transform') || '';
    
    // 应用拖拽变换
    target.style.transform = `${initialTransform} translate(${x}px, ${y}px)`.trim();

    // 更新数据属性
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}

function handleDragEnd(event: any) {
    console.log('结束拖拽:', props.control.label);
    const target = event.target;
    
    // 获取累积的移动量
    const dx = parseFloat(target.getAttribute('data-x') || '0');
    const dy = parseFloat(target.getAttribute('data-y') || '0');
    
    // 发送几何更新事件（批量处理）
    emit('update-geometry', { 
      id: props.control.id, 
      dx, 
      dy, 
      isDrag: true 
    });
    
    // 清理临时状态
    target.style.transform = target.getAttribute('data-initial-transform') || '';
    target.removeAttribute('data-x');
    target.removeAttribute('data-y');
    target.removeAttribute('data-initial-transform');
    
    emit('drag-end', event);
    isInteracting.value = false;
}

function handleResizeStart(event: any) {
  isInteracting.value = true;
  const target = event.target;
  
  // 记录初始状态
  const initialTransform = target.style.transform || '';
  target.setAttribute('data-initial-transform', initialTransform);
  
  // 为了在缩放过程中获得准确的视觉反馈，我们需要临时移除transform
  // 并调整left/top来补偿位置
  if (initialTransform.includes('translate')) {
    const rect = target.getBoundingClientRect();
    const parentRect = target.parentElement.getBoundingClientRect();
    
    // 计算元素相对于父容器的实际显示位置
    const actualLeft = rect.left - parentRect.left;
    const actualTop = rect.top - parentRect.top;
    
    // 临时移除transform并设置绝对位置
    target.style.transform = '';
    target.style.left = `${actualLeft}px`;
    target.style.top = `${actualTop}px`;
    
    // 记录临时状态，用于恢复
    target.setAttribute('data-temp-positioning', 'true');
    target.setAttribute('data-original-left', target.style.left);
    target.setAttribute('data-original-top', target.style.top);
  }
  
  // 重置累积位移
  target.setAttribute('data-x', '0');
  target.setAttribute('data-y', '0');
  
  console.log('开始缩放:', props.control.label, {
    初始变换: initialTransform || '无',
    临时定位: target.getAttribute('data-temp-positioning') === 'true',
    当前位置: { left: target.style.left, top: target.style.top },
    初始大小: {
      width: getComputedStyle(target).width,
      height: getComputedStyle(target).height
    },
    事件rect: event.rect
  });
}

function handleResizeMove(event: any) {
    const target = event.target;
    let x = parseFloat(target.getAttribute('data-x')) || 0;
    let y = parseFloat(target.getAttribute('data-y')) || 0;

    // 处理从顶部或左侧边缘缩放时的位移
    x += event.deltaRect.left;
    y += event.deltaRect.top;

    // 直接设置大小和位置
    target.style.width = event.rect.width + 'px';
    target.style.height = event.rect.height + 'px';
    
    // 如果有位移，应用translate变换
    if (x !== 0 || y !== 0) {
        target.style.transform = `translate(${x}px, ${y}px)`;
    } else {
        target.style.transform = '';
    }

    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
    
    console.log('缩放移动中:', {
        元素: props.control.label,
        事件rect: event.rect,
        累积位移: { x, y },
        deltaRect: event.deltaRect,
        当前变换: target.style.transform,
        当前大小: { width: target.style.width, height: target.style.height },
        临时定位模式: target.getAttribute('data-temp-positioning') === 'true'
    });
}

function handleResizeEnd(event: any) {
    console.log('结束缩放:', props.control.label);
    const target = event.target;
    
    // 使用interact.js提供的rect信息，这是用户操作的真实结果
    const interactRect = event.rect;
    const parentRect = target.parentElement.getBoundingClientRect();
    
    // 计算相对于父容器的位置和尺寸
    const relativeRect = {
      left: interactRect.left - parentRect.left,
      top: interactRect.top - parentRect.top,
      right: interactRect.right - parentRect.left,
      bottom: interactRect.bottom - parentRect.top,
      width: interactRect.width,
      height: interactRect.height
    };

    console.log('缩放结束，详细信息:', {
      interact事件rect: interactRect,
      父容器位置: parentRect,
      计算的相对位置: relativeRect,
      使用了临时定位: target.getAttribute('data-temp-positioning') === 'true',
      interact事件完整信息: {
        rect: event.rect,
        deltaRect: event.deltaRect,
        edges: event.edges
      }
    });

    emit('update-geometry', { id: props.control.id, newRect: relativeRect, isDrag: false });

    // 清理临时状态
    target.style.transform = '';
    target.style.width = '';
    target.style.height = '';
    
    // 如果使用了临时定位，清理相关属性
    if (target.getAttribute('data-temp-positioning') === 'true') {
        target.style.left = '';
        target.style.top = '';
        target.removeAttribute('data-temp-positioning');
        target.removeAttribute('data-original-left');
        target.removeAttribute('data-original-top');
    }
    
    target.removeAttribute('data-x');
    target.removeAttribute('data-y');
    target.removeAttribute('data-initial-transform');
    
    isInteracting.value = false;
}

onBeforeUnmount(() => {
  try {
    if (controlRef.value && interact && typeof interact.isSet === 'function') {
      if (interact.isSet(controlRef.value)) {
        interact(controlRef.value).unset();
      }
    }
  } catch (error) {
    console.warn('清理interact.js时出错:', error);
  }
});
</script>

<template>
  <div
    ref="controlRef"
    class="control-renderer absolute border border-dashed flex items-center justify-center text-sm select-none"
    :class="{ 
      'ring-2 ring-red-500 ring-inset': isSelected,
      'z-10': isSelected, // 提高选中元素的层级
      'cursor-move': !isSelected,
      'cursor-nw-resize': isSelected,
      'touch-none': true,
      'border-blue-400': props.control.type !== 'radial',
      'border-green-400 bg-green-50 rounded-full': props.control.type === 'radial'
    }"
    :style="styleObject"
    :data-id="props.control.id"
    @pointerdown="handlePointerDown"
  >
    <div v-if="isPrimarySelected" class="resize-handles">
        <!-- ... 缩放点的HTML和CSS ... -->
    </div>
    
    <!-- 根据控件类型显示不同的内容 -->
    <!-- 注意：组控件现在由 GroupRenderer 专门处理，这里不再渲染组控件 -->
    
    <div v-if="props.control.type === 'radial'" class="text-center">
      <div class="font-semibold text-green-700">{{ props.control.style?.centerLabel || props.control.label }}</div>
      <div class="text-xs text-green-500">{{ props.control.buttons?.length || 0 }} 个按钮</div>
    </div>
    
    <span v-else class="pointer-events-none">{{ props.control.label }}</span>
  </div>
</template>


