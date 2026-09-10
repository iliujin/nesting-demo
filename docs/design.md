# Interface specification

Single-screen Chinese workbench. The visual concept uses a white background, navy text, cobalt blue primary buttons, cool gray dotted canvas and pastel polygon data. No raster image is shipped as the application; all controls are accessible HTML and mathematical geometry is SVG.

Desktop: 72px header, 1280px content limit, 30px headline, compact information strip, 300px settings rail and flexible result canvas. Controls: 14px, 40px height, 6–8px radius, 1px pale borders. Mobile: header wraps, settings then result, controls fill available width without horizontal page scrolling.

Visible copy: Nesting; 二维排样演示; 工作台; 使用说明; GitHub; 让每一块材料，物尽其用。; 选择实例，探索二维不规则零件的排样结果。; 示例预览：当前展示预计算结果，真实求解需连接后端服务。; 求解设置; 排样模式; 无限长容器; 固定容器; 实例来源; 内置示例; 上传实例; 容器宽度; 运行时间; 查看示例结果; 排样预览; 零件编号; 适应画布; 下载 SVG; 零件数量; 材料利用率; 使用长度; 算法在私有服务器运行，页面只接收排样结果。

Intentional functional refinements to the concept: illustrative metrics use actual polygon coordinates (not the concept image's numeric placeholders); precomputed example parameters are read-only to avoid implying re-solving; uploaded data produces a clearly labeled parts preview only; fixed-bin view offers a container selector; zoom controls and JSON export support real interactions. A usage dialog explains these distinctions. Diagram labels use instance units, never assumed millimeters.
