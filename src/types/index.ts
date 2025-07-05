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
    position: Position;
    size: Size;
    style?: Record<string, any>;
    mapping?: any;
    action?: any;
    cooldown?: number;
    controls?: Control[]; // 仅用于 'group' 类型
    buttons?: any[];      // 仅用于 'radial' 类型
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

export interface SafeAreaValue {
  preferred: string;
  min?: string;
  max?: string;
}

export interface Position {
  anchor: string;
  left?: string | SafeAreaValue;
  right?: string | SafeAreaValue;
  top?: string | SafeAreaValue;
  bottom?: string | SafeAreaValue;
}

export interface Size {
  width?: string | SafeAreaValue;
  height?: string | SafeAreaValue;
  aspectRatio?: string;
}
  