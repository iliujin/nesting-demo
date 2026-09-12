# Nesting · 二维排样演示

独立的公开前端。求解器源代码、程序、数据集、数据库和凭证均不在本仓库。

页面：https://iliujin.github.io/nesting-demo/

## 在线演示

打开 [GitHub Pages 演示](https://iliujin.github.io/nesting-demo/)，点击 **播放优化演示**，即可查看排样逐步变紧凑、利用率提升的过程。

- 两种模式：无限长容器缩短使用长度；固定容器减少容器数量。
- 优化效果：首次与当前利用率、提升百分点、阶梯趋势图和演示步骤明细。
- 排样交互：零件编号、缩放、容器切换，以及 SVG / JSON 下载。
- 上传预览：自己的 TXT 文件只在浏览器解析和展示轮廓。

**公开页面默认是 preview 模式。排样步骤为人工合成，时间刻度为示意，不是在线求解或算法性能测试。** 演示不会请求私有求解接口。

求解器源码、编译程序、私有数据集、服务端代码、数据库与凭证不包含在本仓库。前端另有真实服务客户端，支持提交、取消、运行中最优解与利用率趋势；只有显式配置独立后端才启用。

## 本地运行与验证

使用 Node.js 24。依赖固定在 package-lock.json。

```bash
npm ci
npm run dev
npm test
npm run build
npx playwright install chromium --only-shell
npm run test:e2e
```

打开 `/nesting-demo/`。可在忽略的 `.env.local` 中填写 `NESTING_DEV_API_URL`，仅供本地开发服务器覆盖连接配置。开发页位于 localhost 或 127.0.0.1 时允许访问本机 HTTP 测试接口；公开页面始终要求 HTTPS。本地覆盖不会进入生产配置。

设置环境变量 `REAL_API_URL` 后运行 `npm run test:e2e` 会额外执行真实服务器测试；未设置时明确跳过这些测试。普通 CI 使用接口夹具测试界面状态，不调用私有求解器。

## 配置公网求解

得到可访问的 HTTPS 后端后，修改 `public/config.json`：

```json
{"schemaVersion":1,"mode":"live","apiBaseUrl":"https://api.example.com"}
```

`api.example.com` 是格式示例，需要替换为实际域名。地址末尾不包含 `/api/v1`。后端协议见 [接口说明](docs/backend-contract.md)。确认真实上传、取消、结果读取和跨域访问后，推送 main，GitHub Actions 会验证并发布。

接口地址和浏览器代码对访问者可见；不要在配置或前端环境变量中放共享密钥。每位访客的短期访问凭证由私有 API 单独签发。

## 输入和结果

支持坐标行 UTF-8 TXT，例如：

```text
name: rectangle-and-triangle
size: 2
object: width: 100
no. quantity
1 2 x 0 20 20 0
y 0 0 10 10
2 1 x 0 15 0
y 0 0 15
```

在线演示接受整数坐标 ±10,000；最多 100 种、500 件、单件 500 个顶点、展开后 10,000 个顶点。请求不超过 1 MiB。PIECE 分块、孔洞和 DXF 暂不支持。浏览器预览范围较宽，最终以服务器校验为准。

无限长模式固定宽度，优化使用长度；演示要求宽度大于最大零件边长。固定容器使用最大零件边长乘以 1.1、1.5 或 2.0 的正方形。运行时间可选 30、60、120 秒，四种旋转角度为 0°、90°、180°、270°。

真实求解不额外设置零件间距，允许边界直接接触，禁止重叠。形状和搜索结果仍可能留下空白；零间隙不代表保证填满容器。坐标搜索网格为无限长模式 1、固定容器模式 0.01（输入坐标单位），JSON 分别记录 clearance 和 placementGridUnits。

SVG 和 JSON 导出区分合成示例与真实计算。真实结果在后端检查零件数量、形状、重叠和越界。任务与上传数据约保留 24 小时；关闭页面不会立即取消后台任务。

验证范围和剩余事项见 [验证记录](docs/verification.md)。

## 局域网独立部署

私有部署可由同一服务器提供页面和 `/api/v1`。运行时配置 `{ "schemaVersion": 1, "mode": "live", "apiBaseUrl": "" }` 使用页面自身地址。HTTP 同源连接仅允许私有 IPv4 地址；公开 GitHub Pages 保持 preview。仓库不保存实际私有部署地址或凭证。

## 演示实现

`src/lib/demo.ts` 仅对公开合成几何做预设平移和容器分组，提供三个说明性步骤，不包含排样搜索算法。`OptimizationTrend.vue` 区分真实结果与演示标签，利用率均按几何总面积计算。演示计时器只控制播放速度，不作为求解耗时。
