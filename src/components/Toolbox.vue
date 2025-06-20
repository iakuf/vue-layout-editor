<!-- src/components/Toolbox.vue -->
<script setup lang="ts">
const controlTypes = [
  { type: 'button', label: '按钮' },
  { type: 'd-pad', label: '方向盘' },
  { type: 'joystick', label: '摇杆' },
  { type: 'slider', label: '滑块' },
  { type: 'group', label: '控件组' },
  { type: 'radial', label: '轮盘菜单' },
  // ...未来可以添加更多
];

function handleDragStart(event: DragEvent, type: string) {
  // 当拖拽开始时，将控件类型存入dataTransfer中
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify({ type }));
    event.dataTransfer.effectAllowed = 'copy';
  }
}
</script>

<template>
  <aside class="w-50 flex-shrink-0 p-4 border-r border-gray-200 bg-white">
    <h3 class="text-lg font-semibold mb-4">工具箱</h3>
    <ul>
      <li
        v-for="control in controlTypes"
        :key="control.type"
        class="p-2 border rounded cursor-grab mb-2 hover:bg-gray-100"
        draggable="true"
        @dragstart="handleDragStart($event, control.type)"
      >
        {{ control.label }}
      </li>
    </ul>
  </aside>
</template>