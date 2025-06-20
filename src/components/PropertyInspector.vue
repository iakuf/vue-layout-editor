<script setup lang="ts">
import { computed } from 'vue';
import { selectedControlIds, primarySelectedControl, executeCommand } from '../store';
import { UpdatePropertyCommand } from '../commands/UpdatePropertyCommand';
import GroupConfig from './GroupConfig.vue';
import RadialConfig from './RadialConfig.vue';

// 该计算属性现在用于显示信息
const displayControl = computed(() => {
    // 只有当只选择了一个控件时，才返回该控件对象
    if (selectedControlIds.value.length === 1) {
        return primarySelectedControl.value;
    }
    return null;
});

/**
 * 处理属性变更的通用函数
 * @param propertyPath - 要修改的属性路径，例如 'label' 或 'style.color'
 * @param event - DOM事件对象
 */
function handlePropertyChange(propertyPath: string, event: Event) {
  if (!displayControl.value) return;

  const target = event.target as HTMLInputElement;
  const newValue = target.value;

  // 创建并执行命令
  const command = new UpdatePropertyCommand(displayControl.value.id, propertyPath, newValue);
  executeCommand(command);
}
</script>

<template>
    <aside class="w-70 flex-shrink-0 p-4 border-l border-gray-200 bg-white overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">属性检查器</h3>

        <div v-if="selectedControlIds.length > 1">
            <p class="text-gray-600">已选中 {{ selectedControlIds.length }} 个控件。</p>
            <!-- 未来可以在此添加批量修改通用属性的UI -->
        </div>

        <div v-else-if="displayControl" class="space-y-4">
            <!-- 单选时显示详细信息 -->
            <div>
                <label class="block text-sm font-medium text-gray-700">ID</label>
                <input type="text" :value="displayControl.id" readonly class="mt-1 block w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
            </div>

            <div>
                <label for="label-input" class="block text-sm font-medium text-gray-700">标签 (Label)</label>
                <input 
                  id="label-input"
                  type="text" 
                  :value="displayControl.label" 
                  @change="handlePropertyChange('label', $event)"
                  class="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <!-- 如果是控件组，则显示其专属配置UI -->
            <GroupConfig v-if="displayControl.type === 'group'" :control="displayControl" />
            
            <!-- 如果是轮盘菜单，则显示其专属配置UI -->
            <RadialConfig v-if="displayControl.type === 'radial'" :control="displayControl" />
            
            <!-- ... 其他属性编辑UI ... -->
        </div>

        <div v-else class="text-gray-500">
            <p>请在画布中选择一个控件以编辑其属性。</p>
        </div>
    </aside>
</template>