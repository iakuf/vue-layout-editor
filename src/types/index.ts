// src/types/index.ts

/**
 * 轮盘菜单按钮定义
 */
export interface RadialButton {
  label: string;
  angle: number;
  action?: any;
}

/**
 * 定义单个控件的基础结构
 */
export interface Control {
    id: string;
    type: 'button' | 'd-pad' | 'joystick' | 'group' | 'radial' | 'slider';
    label: string;
    position: any; // 暂时使用 any，后续会定义更具体的类型
    size: any;     // 暂时使用 any
    style?: Record<string, any>; // 改为any以支持更复杂的样式对象
    mapping?: any;
    action?: any;
    cooldown?: number;
    controls?: Control[]; // 仅用于 'group' 类型
    buttons?: RadialButton[]; // 仅用于 'radial' 类型
}

/**
 * 定义整个布局文件的顶层结构
 */
export interface Layout {
  layoutId: string;
  name: string;
  version?: string;
  inherits?: string;
  initialSet: string;
  controlSets: Record<string, Control[]>;
}
  