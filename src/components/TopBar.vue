<script setup lang="ts">
import { ref } from 'vue';
import { executeCommand, layout, undo, redo, selectedControlIds } from '../store';
import { AddControlCommand } from '../commands/AddControlCommand';
import { DeleteControlsCommand } from '../commands/DeleteControlsCommand';
import { UpdatePropertyCommand } from '../commands/UpdatePropertyCommand';
import { LoadLayoutCommand } from '../commands/LoadLayoutCommand';
import { createControl } from '../factories/controlFactory';
import { v4 as uuidv4 } from 'uuid';
import { convertLayoutToResponsiveUnits, convertLayoutToPxUnits } from '../utils/positionUnitConverter';

function addTestButton() {
  const newButton = {
    id: uuidv4(),
    type: 'button' as const,
    label: '新按钮',
    position: { anchor: 'center', left: '50%', top: '50%' },
    size: { width: '120px', height: '60px' },
  };
  const command = new AddControlCommand(newButton);
  executeCommand(command);
}

function addTestGroup() {
  const newGroup = createControl('group', { x: 100, y: 100 });
  const command = new AddControlCommand(newGroup);
  executeCommand(command);
}

function addTestRadial() {
  const newRadial = createControl('radial', { x: 300, y: 100 });
  const command = new AddControlCommand(newRadial);
  executeCommand(command);
}

function deleteSelected() {
  if (selectedControlIds.value.length > 0) {
    // 使用新的批量删除命令
    const command = new DeleteControlsCommand(selectedControlIds.value);
    executeCommand(command);
  } else {
    alert('请先在画布上选择一个或多个控件');
  }
}

function changeLabel() {
  // 仅当只选择一个控件时才允许修改标签
  if (selectedControlIds.value.length === 1) {
    const controlId = selectedControlIds.value[0];
    const newLabel = `已更新 ${Math.random().toString(36).substring(7)}`;
    const command = new UpdatePropertyCommand(controlId, 'label', newLabel);
    executeCommand(command);
  } else {
    alert('请选择单个控件以修改其标签');
  }
}

const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      let newLayout = JSON.parse(content);
      // 获取画布DOMRect
      const canvasElem = document.getElementById('layout-canvas');
      let canvasRect: DOMRect = { width: 812, height: 375, left: 0, top: 0, right: 0, bottom: 0 } as DOMRect;
      if (canvasElem) {
        canvasRect = canvasElem.getBoundingClientRect();
      }
      // 单位反转换，全部转为px
      newLayout = convertLayoutToPxUnits(newLayout, canvasRect);
      const command = new LoadLayoutCommand(newLayout);
      executeCommand(command);
    } catch (error) {
      console.error("Failed to parse JSON file:", error);
      alert("导入失败：文件格式不是有效的JSON。");
    }
  };
  reader.readAsText(file);
  target.value = '';
}

function exportLayout() {
  // 获取画布DOMRect
  const canvasElem = document.getElementById('layout-canvas');
  let canvasRect: DOMRect = { width: 812, height: 375, left: 0, top: 0, right: 0, bottom: 0 } as DOMRect;
  if (canvasElem) {
    canvasRect = canvasElem.getBoundingClientRect();
  }
  // 单位转换兜底
  const responsiveLayout = convertLayoutToResponsiveUnits(layout, canvasRect);
  console.log('导出前的responsiveLayout:', responsiveLayout);
  const jsonString = JSON.stringify(responsiveLayout, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${layout.name || 'layout'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <header class="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
    <h2 class="text-xl font-bold">虚拟控制器布局编辑器</h2>
    <div class="flex items-center gap-2">
      <button @click="addTestButton" class="px-3 py-1 bg-blue-500 text-white rounded">添加按钮</button>
      <button @click="addTestGroup" class="px-3 py-1 bg-blue-500 text-white rounded">添加测试组</button>
      <button @click="addTestRadial" class="px-3 py-1 bg-blue-500 text-white rounded">添加测试径向</button>
      <button @click="deleteSelected" class="px-3 py-1 bg-red-500 text-white rounded">删除选中</button>
      <button @click="changeLabel" class="px-3 py-1 bg-green-500 text-white rounded">修改标签</button>
      <button @click="undo" class="px-3 py-1 bg-gray-500 text-white rounded">撤销 (Undo)</button>
      <button @click="redo" class="px-3 py-1 bg-gray-500 text-white rounded">重做 (Redo)</button>
      <button @click="triggerFileInput" class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">导入JSON</button>
      <input 
        type="file" 
        ref="fileInput" 
        @change="handleFileImport" 
        class="hidden" 
        accept="application/json"
      />
      <button @click="exportLayout" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">导出JSON</button>
    </div>
  </header>
</template>
