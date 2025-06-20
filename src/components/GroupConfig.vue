<script setup lang="ts">
import type { Control } from '../types';
import { selectedControlIds } from '../store';

defineProps<{
  control: Control;
}>();

// 点击子控件时，选择它
function selectChild(childId: string) {
  // 更新selectedControlIds以选中子控件
  selectedControlIds.value = [childId];
  console.log(`选中了子控件: ${childId}`);
}
</script>

<template>
  <div class="mt-4 border-t pt-4">
    <h4 class="text-md font-semibold mb-2">控件组子项 ({{ control.controls?.length || 0 }}个)</h4>
    <ul v-if="control.controls && control.controls.length > 0" class="space-y-2">
      <li
        v-for="child in control.controls"
        :key="child.id"
        class="p-2 border rounded text-sm hover:bg-gray-100 cursor-pointer"
        @click="selectChild(child.id)"
      >
        {{ child.label || child.type }} (ID: ...{{ child.id.slice(-4) }})
      </li>
    </ul>
    <p v-else class="text-gray-500 text-sm">此控件组为空，可将其他控件拖拽至此区域内。</p>
    <!-- 未来可以添加"添加新子控件"的按钮 -->
  </div>
</template> 