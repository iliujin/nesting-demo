# 私有 API 接入协议

客户端已实现并完成本地实际联调。公开配置保持 preview，直到有可用的公网 HTTPS 地址。

## 连接与身份

- `config.json` 的 `apiBaseUrl` 是公开 HTTPS 基础地址，不含 `/api/v1`。
- CORS 允许来源 `https://iliujin.github.io`，Origin 不包含仓库路径。
- `POST /api/v1/sessions` 返回每位访客独立的随机 token 和 expiresAt。
- 随后请求携带 `Authorization: Bearer ...`，不依赖第三方 Cookie，也不需要共享前端密钥。
- 凭证保留在当前页面内存；新提交可以建立新会话，已有任务查询保持原身份。

## 路由

| 路由 | 请求或响应 |
| --- | --- |
| GET `/api/v1/health/ready` | 200 表示 API 与 Worker 就绪，503 表示未就绪 |
| POST `/api/v1/sessions` | 201，`token`、`expiresAt` |
| POST `/api/v1/instances` | JSON `{text}`；201，实例 `id`、名称、数量 |
| POST `/api/v1/jobs` | `{instanceId,mode,width?,sizeFactor,timeLimitSeconds}`；202，任务状态 |
| GET `/api/v1/jobs/{id}` | `id,status,hasResult,error,startedAt,finishedAt` |
| POST `/api/v1/jobs/{id}/cancel` | 返回取消后的当前状态 |
| GET `/api/v1/jobs/{id}/result` | 完整可行排样；没有结果时 409 |

模式：strip 或 bin。状态：queued、running、stopping、completed、failed、cancelled、timed_out、interrupted。完成状态不代表全局最优；超时或取消时可能仍有有效可行解。

结果包括 `kind: solver_result`、`validated: true`、`name`、`mode`、`width`、`height`、`containers`、`placements`。每个 placement 包含整数 id、typeId、container（从 0 开始）、rotation 和世界坐标 polygon。strip 的 width 是实际使用长度，height 是请求的固定宽度。

额外元数据包括 jobId、status、elapsedSeconds、输入摘要和运行参数。后端采用保守的整数几何边界，`numericalGuardUnits` 记录对应数值边界；前端不重新求解。

错误使用 `{detail: "可展示的信息"}`，不返回命令、日志或内部路径。身份失效 401，非本人或不存在的资源 404，参数错误 422，达到限额 429。

## 限额

单任务隔离执行，四 CPU 配额、1 GiB 内存、128 进程上限、无网络。全局一次运行一个任务；运行和排队合计最多 20 个，每访客最多 2 个未完成任务，每分钟最多提交 6 次，并有全局限额。原始求解日志始终留在私有服务端。
