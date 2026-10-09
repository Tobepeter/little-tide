# Little Tide · 小小潮汐

一个可直接在浏览器中玩的 3D 水上积木小镇。使用 Three.js 绘制建筑与水面，React、shadcn/ui 和 Lucide 提供简洁的操作界面。

[打开在线站点](https://little-tide-town.zippy-pearl-2484.chatgpt.site)

## 功能

- 建造房屋和平台、上色、拆除；默认随机配色与建筑样式。
- 连续刷与 1×1、3×3、5×5 范围编辑；按整笔撤销、重做。
- 支持鼠标和触屏的环绕、平移与缩放。
- 建造弹跳动画、昼夜切换、水面反射与波光。
- 小镇保存在当前浏览器的本地存储中。

## 本地运行

开发环境使用 Node.js 24 和 npm。

```bash
npm ci
npm run build
npm run check
```

将 `dist/` 作为静态站点根目录启动 HTTP 服务。例如，安装 Python 3 后运行：

```bash
python3 -m http.server 5173 --directory dist
```

在浏览器打开 <http://localhost:5173>。仓库已包含构建产物；如果只是运行现有版本，可以直接启动上述静态服务。请通过 HTTP 访问，不要直接双击 HTML 文件。

## 操作

| 操作 | 电脑 | 手机 |
| --- | --- | --- |
| 编辑一处 | 点击并松开 | 轻点并松开 |
| 环绕视角 | 左键拖动 | 单指拖动 |
| 平移 | 右键或中键拖动 | 双指拖动 |
| 缩放 | 滚轮 | 双指捏合 |
| 批量编辑 | 开启连续刷后拖动，或 Shift + 拖动 | 开启连续刷后单指拖动 |
| 连续刷中移动视角 | 按住空格拖动 | 双指拖动或捏合 |
| 切换工具 | 1—4 | 底部工具按钮 |
| 连续刷 / 配色 | B / C | 底部对应按钮 |
| 撤销 / 重做 | Ctrl 或 ⌘ + Z / Shift + Z | 底部对应按钮 |

## 工程结构

| 路径 | 用途 |
| --- | --- |
| `src/App.jsx` | 工具栏、设置与交互界面 |
| `src/components/ui/` | shadcn/ui 组件 |
| `src/styles.css` | 主题与响应式样式 |
| `dist/game.js` | Three.js 场景、渲染与游戏逻辑 |
| `dist/model.js` | 小镇数据模型 |
| `dist/brush.js` | 范围编辑与笔刷逻辑 |
| `dist/motion.js` | 建造动画 |
| `dist/camera-input.js` | 相机输入协调 |
| `dist/render-budget.js` | 渲染预算与性能设置 |
| `dist/ui-store.js` | 游戏与 React 界面之间的状态桥接 |
| `dist/vendor/` | 浏览器端 Three.js 依赖及第三方许可文件 |
| `scripts/build-ui.mjs` | 构建界面 JavaScript 与 CSS |
| `scripts/verify*.mjs` | 数据、动画、渲染配置、桌面及触屏交互检查 |
| `.openai/hosting.json` | 当前 Sites 项目的关联与静态发布目录 |

**`dist/` 也包含手写源码。** 当前构建命令只生成界面的 `ui.js` 和 `style.css` 等文件，不会重建整个游戏。修改场景时直接编辑对应的 `dist/*.js`，不要删除整个 `dist/`。

## 发布

普通静态托管服务可直接发布 `dist/`。如果使用持续集成，可执行 `npm ci && npm run build`，输出目录填写 `dist`。

现有在线版本由 ChatGPT Sites 托管。仓库保留了该站点的关联配置；向 GitHub 提交代码不会自动更新 Sites，仍需通过有权限的 Sites 发布流程部署。

## 第三方组件

依赖版本记录在 `package-lock.json`。浏览器端随项目分发的第三方许可保留在 `dist/vendor/` 与 `dist/ui.js.LEGAL.txt` 中。
