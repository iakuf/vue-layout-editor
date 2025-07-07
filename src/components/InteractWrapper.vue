<template>
  <div
    ref="elementRef"
    class="interact-wrapper"
    :class="wrapperClass"
    :style="computedStyle"
    :data-interacting="isInteracting"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import interact from 'interactjs';

// --- 1. 定义 Props ---
interface Props {
  draggable?: boolean;
  resizable?: boolean;
  selectable?: boolean;
  elementId?: string;
  wrapperClass?: any;
  initialPosition?: Record<string, any>;
  initialSize?: Record<string, any>;
  resizeEdges?: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean };
  resizeMinSize?: { width: number; height: number };
  debug?: boolean;
}

// --- 2. 定义 Emits ---
interface Emits {
  (e: 'select', id: string): void;
  (e: 'drag-start', data: { id: string; event: any }): void;
  (e: 'drag-end', data: { id: string; rect: any; event: any }): void;
  (e: 'resize-start', data: { id: string; event: any }): void;
  (e: 'resize-end', data: { id: string; rect: any; event: any }): void;
}

const props = withDefaults(defineProps<Props>(), {
  draggable: false,
  resizable: false,
  selectable: true,
  resizeEdges: () => ({ left: true, right: true, top: true, bottom: true }),
  resizeMinSize: () => ({ width: 50, height: 50 }),
  debug: false
});

const emit = defineEmits<Emits>();

// --- 3. 内部状态 ---
const elementRef = ref<HTMLElement>();
const isInteracting = ref(false);
const interactionStyle = ref<Record<string, any>>({});
const fixedParentRect = ref<{ left: number; top: number; right: number; bottom: number; width: number; height: number } | null>(null); // 静态的父元素边界框

function log(message: string, data?: any) {
  if (props.debug) {
    console.log(`[InteractWrapper] ${message}`, data);
  }
}

// --- 4. 计算属性：组合样式 ---
const computedStyle = computed(() => {
  // 如果正在交互，使用交互时的样式
  if (isInteracting.value && Object.keys(interactionStyle.value).length > 0) {
    return interactionStyle.value;
  }
  
  // 否则使用props中的样式
  const newStyle: Record<string, any> = {};
  const position = props.initialPosition || {};
  const size = props.initialSize || {};
  
  if (size.width) newStyle.width = size.width;
  if (size.height) newStyle.height = size.height;
  
  const anchor = position.anchor || 'top-left';
  let anchorY: string, anchorX: string;
  
  if (anchor === 'center') {
    anchorY = 'middle';
    anchorX = 'center';
  } else {
    const parts = anchor.split('-');
    anchorY = parts[0];
    anchorX = parts[1];
  }
  
  let transformValue = '';
  
  if (anchorX === 'left' && position.left !== undefined) {
    newStyle.left = position.left;
  } else if (anchorX === 'right' && position.right !== undefined) {
    newStyle.right = position.right;
  } else if (anchorX === 'center') {
    newStyle.left = position.left || '50%';
    transformValue += 'translateX(-50%) ';
  }
  
  if (anchorY === 'top' && position.top !== undefined) {
    newStyle.top = position.top;
  } else if (anchorY === 'bottom' && position.bottom !== undefined) {
    newStyle.bottom = position.bottom;
  } else if (anchorY === 'middle') {
    newStyle.top = position.top || '50%';
    transformValue += 'translateY(-50%)';
  }
  
  if (transformValue) {
    newStyle.transform = transformValue.trim();
  }
  
  return newStyle;
});

// --- 5. 监听 Props 变化 ---
watch(() => [props.initialPosition, props.initialSize], 
  () => {
    // 如果不在交互中，清除交互样式
    if (!isInteracting.value) {
      interactionStyle.value = {};
      fixedParentRect.value = null;
    }
  }, 
  { deep: true }
);

// --- 6. 事件处理器 ---

function handleInteractionStart(event: any, type: 'drag' | 'resize') {
  isInteracting.value = true;
  log(`开始${type}`, { id: props.elementId });

  // 获取当前元素的实际位置和尺寸
  const currentTarget = event.currentTarget as HTMLElement;
  if (!currentTarget) return;

  const rect = currentTarget.getBoundingClientRect();
  const parentElement = currentTarget.parentElement;
  
  if (!parentElement) return;

  // ✨ 关键修复：确保保存的是真正的静态数值，完全脱离响应式系统
  const parentRect = parentElement.getBoundingClientRect();
  fixedParentRect.value = {
    left: Number(parentRect.left),
    top: Number(parentRect.top), 
    right: Number(parentRect.right),
    bottom: Number(parentRect.bottom),
    width: Number(parentRect.width),
    height: Number(parentRect.height)
  };

  // 计算相对于父元素的位置
  const relativeLeft = rect.left - fixedParentRect.value.left;
  const relativeTop = rect.top - fixedParentRect.value.top;

  // 设置交互时的样式，确保位置固定
  interactionStyle.value = {
    left: `${relativeLeft}px`,
    top: `${relativeTop}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    right: undefined,
    bottom: undefined,
    transform: undefined,
  };

  log(`交互开始，固定父元素边界 (静态数值):`, {
    left: fixedParentRect.value.left,
    top: fixedParentRect.value.top,
    width: fixedParentRect.value.width,
    height: fixedParentRect.value.height
  });

  nextTick(() => {
    if (type === 'drag') {
      emit('drag-start', { id: props.elementId!, event });
    } else {
      emit('resize-start', { id: props.elementId!, event });
    }
  });
}

function handleInteractionMove(event: any) {
  // ✨ 关键修复：使用固定的静态父元素边界框
  if (!fixedParentRect.value) return;
  
  // 更新交互样式，使用固定的父元素边界框
  interactionStyle.value = {
    left: `${event.rect.left - fixedParentRect.value.left}px`,
    top: `${event.rect.top - fixedParentRect.value.top}px`,
    width: `${event.rect.width}px`,
    height: `${event.rect.height}px`,
    right: undefined,
    bottom: undefined,
    transform: undefined,
  };
}

function handleInteractionEnd(event: any, type: 'drag' | 'resize') {
  // ✨ 关键修复：使用固定的静态父元素边界框
  if (!fixedParentRect.value) return;
  
  const finalRect = {
    left: event.rect.left - fixedParentRect.value.left,
    top: event.rect.top - fixedParentRect.value.top,
    width: event.rect.width,
    height: event.rect.height,
  };
  
  log(`结束${type}`, { id: props.elementId, finalRect });
  
  // 立即重置交互状态，避免状态残留
  isInteracting.value = false;
  
  // 先发送事件
  if (type === 'drag') {
    emit('drag-end', { id: props.elementId!, rect: finalRect, event });
  } else {
    emit('resize-end', { id: props.elementId!, rect: finalRect, event });
  }
  
  // 在下一个tick清理样式状态，确保事件处理完成
  nextTick(() => {
    interactionStyle.value = {};
    fixedParentRect.value = null;
    log(`交互状态已重置 (${type})`, { id: props.elementId });
  });
}

function handleClick() {
  if (props.selectable && props.elementId) {
    emit('select', props.elementId);
  }
}

// --- 7. interact.js 初始化 ---
onMounted(() => {
  if (!elementRef.value) return;
  const element = elementRef.value;
  const interactInstance = interact(element);
  
  if (props.draggable) {
    interactInstance.draggable({
      listeners: {
        start: (event) => handleInteractionStart(event, 'drag'),
        move: handleInteractionMove,
        end: (event) => handleInteractionEnd(event, 'drag'),
      },
      modifiers: [
        interact.modifiers.restrictRect({ 
          restriction: 'parent',
          endOnly: true // 只在结束时应用限制，避免中间过程的布局影响
        })
      ],
      // 关键修复：确保拖拽时不影响其他元素
      cursorChecker: () => 'move',
      ignoreFrom: '.resize-handles' // 忽略resize手柄区域
    });
  }
  
  if (props.resizable) {
    interactInstance.resizable({
      edges: props.resizeEdges,
      margin: 10, // 增加边缘检测距离，确保resize只在真正的边缘激活
      listeners: {
        start: (event) => handleInteractionStart(event, 'resize'),
        move: handleInteractionMove,
        end: (event) => handleInteractionEnd(event, 'resize'),
      },
      modifiers: [
        interact.modifiers.restrictEdges({ 
          outer: 'parent',
          endOnly: true // 只在结束时应用限制
        }),
        interact.modifiers.restrictSize({ 
          min: props.resizeMinSize,
          endOnly: true // 只在结束时应用限制
        })
      ],
      // 关键修复：确保resize时不影响其他元素
      preserveAspectRatio: false,
      square: false
    });
  }
  
  // 全局配置：防止interact影响其他元素
  interactInstance.styleCursor(false); // 禁用interact的cursor样式管理，由CSS控制
});

onBeforeUnmount(() => {
  try {
    if (elementRef.value) {
      // 🔧 方法1：尝试使用标准方式清理
      if (interact && typeof interact.isSet === 'function') {
        try {
          if (interact.isSet(elementRef.value)) {
            interact(elementRef.value).unset();
            log('InteractWrapper标准清理成功');
            return;
          }
        } catch (isSetError) {
          console.warn('interact.isSet检查失败:', isSetError);
        }
      }
      
      // 🔧 方法2：尝试直接清理
      try {
        const instance = interact(elementRef.value);
        if (instance && typeof instance.unset === 'function') {
          instance.unset();
          log('InteractWrapper直接清理成功');
          return;
        }
      } catch (directError) {
        console.warn('直接清理失败:', directError);
      }
      
      // 🔧 方法3：尝试手动移除事件监听器
      try {
        const element = elementRef.value;
        element.removeEventListener('pointerdown', () => {});
        element.removeEventListener('pointermove', () => {});
        element.removeEventListener('pointerup', () => {});
        element.removeEventListener('mousedown', () => {});
        element.removeEventListener('mousemove', () => {});
        element.removeEventListener('mouseup', () => {});
        element.removeEventListener('touchstart', () => {});
        element.removeEventListener('touchmove', () => {});
        element.removeEventListener('touchend', () => {});
        log('InteractWrapper手动清理完成');
      } catch (manualError) {
        console.warn('手动清理失败:', manualError);
      }
    }
  } catch (error) {
    // 静默处理所有清理错误，避免影响组件卸载
    console.warn('InteractWrapper清理过程中的错误已忽略:', error);
  }
});

defineExpose({
  isInteracting
});
</script>

<style scoped>
.interact-wrapper {
  position: absolute;
  box-sizing: border-box;
  user-select: none;
  /* 关键修复：确保每个wrapper都有独立的定位上下文 */
  contain: layout style paint; /* CSS Containment：隔离布局、样式和绘制 */
  transform: translateZ(0); /* 强制创建独立的层叠上下文 */
  isolation: isolate; /* 创建新的层叠上下文，防止影响兄弟元素 */
  will-change: transform; /* 提示浏览器这个元素会进行变换 */
}

.interact-wrapper:focus {
  outline: none;
}

/* 确保在交互时保持独立性 */
.interact-wrapper:active,
.interact-wrapper[data-interacting="true"] {
  z-index: 9999; /* 交互时提升层级，但不影响其他元素布局 */
  contain: strict; /* 最严格的隔离模式 */
}
</style>
