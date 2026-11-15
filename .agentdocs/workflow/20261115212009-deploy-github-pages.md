# GitHub 仓库与 Pages 发布

## 背景与目标

- 会话：会话-10起。
- 用户明确要求提交并发布到 GitHub，同时部署 GitHub Pages，替代上一轮仅本地交付选择。
- 基础分支保持 `main`，原有本地提交 `419fabf`、`b6dc949` 保留。
- 目标仓库：`https://github.com/LeP-Ton/bianjing-scroll`。
- 目标网站：`https://lep-ton.github.io/bianjing-scroll/`；最终可用性以实际部署与请求结果为准。

## 约束与原则

- 继续使用原生静态架构，不添加构建依赖。
- 只将 `dist/` 上传为 Pages 制品；源码和项目文档保存在 GitHub 仓库中。
- 不向早期 Sites 仓库推送，不调用 Sites 发布；保留历史注册标识。
- 凭据由现有 GitHub 登录管理，不写入项目。

## 阶段与 TODO

- [x] 检查 `main`、工作区、相关历史文档与现有登录
- [x] 核查静态资源相对路径兼容仓库子路径
- [x] 准备 Pages 自动部署工作流
- [x] 更新 README、项目长期发布方式与根索引
- [ ] 创建 GitHub 仓库并推送完整历史
- [ ] 配置 Pages 的工作流发布来源
- [ ] 确认 GitHub Actions 部署成功
- [ ] 检查线上首页、脚本、样式和图片

## 代码变更

- `.github/workflows/pages.yml`：`main` 上的 `dist/` 与工作流变更触发部署，也支持手动触发；检查页面和脚本后，上传 `dist/` 并发布。
- `README.md`：补充仓库、在线游玩地址与自动部署说明。
- `AGENTS.md`：发布平台改为 GitHub Pages，明确工作流和目录职责。
- `.agentdocs/index.md`：登记本次需求与部署记录。
- 应用页面、样式、寻物数据和交互逻辑不变。

## 关键实现说明

- 使用 GitHub 官方工作流文档所支持的 `checkout@v6`、`configure-pages@v5`、`upload-pages-artifact@v4`、`deploy-pages@v4` 组合。
- 部署任务仅申请 `contents:read`、`pages:write`、`id-token:write` 权限；通过 `github-pages` 环境发布。
- 并发组限制同一时刻的 Pages 发布；不取消正在进行的部署。
- 页面资源使用相对路径，无需为 `/bianjing-scroll/` 添加路径重写。
- 工作流的路径筛选避免仅更新文档时重复部署。

## 关键风险

- 首次运行前需要启用仓库 Pages 的工作流发布来源。
- 本地 Git 由沙箱用户创建，提升权限后 Git 可能提示所有者不同；仅在单次命令中信任该明确项目路径，不扩大到全局目录。
- 浏览器进度受域名隔离，线上不会继承本地地址的存档。
- 线上字体服务不可用时退回系统宋体，不影响游戏。

## 验证用例

### TC-001 版本与静态文件

- 检查：JavaScript 语法、Git diff、相对资源路径与部署目录。
- 预期：语法正确，页面资源在 `dist/` 内完整存在。
- 状态：待回填本轮最终检查。

### TC-002 自动部署

- 操作：推送部署配置到 `main`，等待对应提交的 Actions 完成。
- 预期：获取源码、检查、上传与部署步骤成功。
- 状态：待执行。

### TC-003 线上可用性

- 操作：请求 Pages 首页、app.js、styles.css 与三张图片；在浏览器查看页面。
- 预期：资源正常返回，画卷与交互可用，未将源码文档部署为网页。
- 状态：待执行。

## 参考

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages 创建接口](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site)

## 当前结果

部署配置已准备。仓库创建、提交、推送、运行编号及线上验证结果将在完成后回填；当前不宣称已上线。
