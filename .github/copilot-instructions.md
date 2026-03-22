# PV Tool AI 编程指南

## 项目架构与理念
- **领域：** 一个基于 **PixiJS 8** 构建的、用于音乐视频 (PV) 的浏览器端动态排版和视觉效果引擎。
- **技术栈：** 原生 TypeScript + Vite + PixiJS + GSAP。**没有使用 UI 框架** (React/Vue)；UI 是通过 `src/main.ts` 中的 DOM 操作渲染的。
- **核心引擎：** `src/core/engine.ts` 是中央协调器。它管理 PixiJS Application、图层堆叠 (`background`, `decoration`, `media`, `text`, `overlay`)、音频同步 (`beatProvider`)，并触发运行循环。

## 关键开发者工作流
- **启动开发服务器：** 运行 `npm run dev` 
- **生产构建：** 运行 `npm run build`

## 项目特定的编码约定

### 1. 创建新效果 (`src/effects/`)
- 在 `src/effects/` 中创建一个新文件，并继承 `BaseEffect` (来自 `src/effects/base.ts`)。
- **必须实现：** 实现 `abstract readonly name: string`，`protected setup()`，以及 `update(ctx: UpdateContext)`。
- **性能：** 如果该效果会创建繁重的形状或需要密集的计算，请在类内部设置 `readonly heavy: boolean = true;`，以便引擎可以在低端设备上对其进行节流。
- **添加元素：** 始终在 `setup()` 中将 PixiJS 显示对象（Graphics、Text、Sprites）添加到 `this.container`。
- **注册：** 为了不让新效果不可用，请在 `src/effects/index.ts` 中导出它，并在 `src/core/effectCatalog.ts` 中注册它。

### 2. 创建新模板 (`src/templates/`)
- 模板通过组合多个效果来定义视觉主题。
- 创建一个符合 `TemplateConfig` 接口（定义在 `src/core/types.ts` 中）的新模板配置。
- 包含 `palette`，`effects` 数组（具有 `type`、`layer` 和 `config`），以及可选的 `postfx` 或 features。
- 导出并将新模板追加到 `src/templates/index.ts` 内部的列表中。

### 3. 数据流与通信
- **状态管理：** UI (`main.ts`) 将值直接应用到 `PVEngine` 属性。不要使用全局状态管理器。
- **更新循环：** 传递给效果的值在每次调用 `update(ctx)` 时被打包在 `UpdateContext` 参数中。尽可能依赖上下文属性如 `ctx.time`、`ctx.beatIntensity` 和 `ctx.palette`，而不是在内部跟踪状态。
- **颜色解析：** 当设计可以接受彩色输入的效果时，使用 `resolveColor(colorString, ctx.palette)` 助手（来自 `src/core/types.ts`）。这允许支持动态主题占位符，如 `'$primary'` 或 `'$accent'`。

### 4. 代码标准与文件头
- 确保使用 `Record<string, any>` (如有必要) 对所有新配置属性进行适当的类型定义，但尽可能偏好严格的类型。
- **许可文件头：** 每个 TypeScript 文件**必须**以以下内容开头：
  ```typescript
  // PV Tool — Copyright (c) 2026 DanteAlighieri13210914
  // Licensed under AGPL-3.0. For commercial use, see COMMERCIAL.md
  ```