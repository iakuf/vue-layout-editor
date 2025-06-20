<script setup lang="ts">
import type { Control } from '../types';
import { executeCommand } from '../store';
import { UpdateArrayPropertyCommand } from '../commands/UpdateArrayPropertyCommand';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps<{ control: Control }>();

function addRadialButton() {
  const newButton = { id: uuidv4(), label: '新技能', angle: 0, mapping: {} };
  const command = new UpdateArrayPropertyCommand(props.control.id, 'buttons', 'add', { item: newButton });
  executeCommand(command);
}

function removeRadialButton(index: number) {
  const command = new UpdateArrayPropertyCommand(props.control.id, 'buttons', 'remove', { itemIndex: index });
  executeCommand(command);
}

function updateRadialButton(index: number, key: 'label' | 'angle', event: Event) {
  const button = props.control.buttons[index];
  const updatedButton = { ...button, [key]: (event.target as HTMLInputElement).value };
  const command = new UpdateArrayPropertyCommand(props.control.id, 'buttons', 'update', { item: updatedButton, itemIndex: index });
  executeCommand(command);
}
</script>

<template>
  <div class="mt-4 border-t pt-4">
    <h4 class="text-md font-semibold mb-2">轮盘菜单配置</h4>
    <!-- ... 半径、中心标签等通用配置 ... -->
    <div class="mt-4">
        <div class="flex justify-between items-center mb-2">
            <h5 class="font-semibold">轮盘按钮</h5>
            <button @click="addRadialButton" class="px-2 py-1 bg-blue-500 text-white text-xs rounded">+</button>
        </div>
        <ul v-if="control.buttons" class="max-h-48 overflow-y-auto space-y-2">
            <li v-for="(button, index) in control.buttons" :key="button.id" class="p-2 border rounded space-y-2">
                <div class="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="标签"
                      :value="button.label"
                      @change="updateRadialButton(index, 'label', $event)"
                      class="flex-grow p-1 border rounded text-sm"
                    />
                    <input 
                      type="number" 
                      placeholder="角度"
                      :value="button.angle"
                      @change="updateRadialButton(index, 'angle', $event)"
                      class="w-16 p-1 border rounded text-sm" 
                    />
                    <button @click="removeRadialButton(index)" class="px-2 py-1 bg-red-500 text-white text-xs rounded">X</button>
                </div>
            </li>
        </ul>
    </div>
  </div>
</template>