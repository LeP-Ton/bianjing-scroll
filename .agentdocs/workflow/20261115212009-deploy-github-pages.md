# GitHub 仓库与 Pages 发布

## 背景与目标

- 会话：会话-10起。
- 用户明确要求提交并发布到 GitHub，同时部署 GitHub Pages，替代上一轮仅本地交付选择。
- 基础分支保持 `main`，原有本地提交 `419fabf`、`b6dc949` 保留。
- 公开仓库：[LeP-Ton/bianjing-scroll](https://github.com/LeP-Ton/bianjing-scroll)。
- 公开 HTTPS 网站：[入画 · 汴京寻物](https://lep-ton.github.io/bianjing-scroll/)。

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
- [x] 创建公开 GitHub 仓库并同步完整历史
- [x] 配置 Pages 的工作流发布来源
- [x] 确认 GitHub Actions 部署成功
- [x] 检查线上首页、脚本、样式和图片请求
- [x] 完成线上浏览器画卷、提示与寻物发现验收

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
- Pages 的 `build_type` 为 `workflow`，只把 `dist/` 作为公开网站制品。

## Git 对象同步

- 常规 Git 的 Schannel 与 OpenSSL / HTTP/1.1 两种传输均遇到网络重置；现有认证下的 `gh api` 可正常访问 GitHub API，因此改用 Git Database API 同步原始对象。
- 文件从 Git blob 原始字节编码上传；提交保留 author、committer 的原始时区及消息末尾换行。逐个校验 blob、tree 与 commit SHA，完整保留 `419fabf`、`b6dc949`、`2c5d66f` 三个提交的标识和父子关系。
- 空仓库先建立本次任务自己的占位提交；替换前核对远端未被其他人改动，仅替换该自建占位提交，不覆盖他人历史。
- 同步辅助脚本为工作区 `outputs/sync-github.mjs`，不进入项目仓库；认证由 `gh` 管理，凭据不写入脚本、源码或文档。

## 关键风险

- 首次运行前需要启用仓库 Pages 的工作流发布来源。
- 本地 Git 由沙箱用户创建，提升权限后 Git 可能提示所有者不同；仅在单次命令中信任该明确项目路径，不扩大到全局目录。
- 浏览器进度受域名隔离，线上不会继承本地地址的存档。
- 线上字体服务不可用时退回系统宋体，不影响游戏。

## 验证用例

### TC-001 版本与静态文件

- 检查：JavaScript 语法、Git diff、相对资源路径与部署目录。
- 预期：语法正确，页面资源在 `dist/` 内完整存在。
- 状态：通过。`node --check dist/app.js`、`node --check server.mjs`、`git diff --check` 均成功；静态资源相对路径兼容 `/bianjing-scroll/`。

### TC-002 自动部署

- 操作：将部署配置同步到 `main`，等待对应提交的 Actions 完成。
- 预期：获取源码、检查、上传与部署步骤成功。
- 状态：通过。部署提交 `2c5d66f0e12e97021f30521427ba7d0ad1bc8967` 对应 [Actions 运行 43719089456](https://github.com/LeP-Ton/bianjing-scroll/actions/runs/43719089456)，获取源码、检查、上传和发布步骤全部成功。

### TC-003 线上可用性

- 操作：请求 Pages 首页、app.js、styles.css 与三张图片；在浏览器查看页面。
- 预期：资源正常返回，画卷与交互可用，未将源码文档部署为网页。
- 请求检查：通过。首页 GET 返回 200，正文为 14,226 字节；`app.js`、`styles.css`、`assets/qingming.jpg`、`assets/overview.jpg`、`assets/celadon.jpg` 的 HEAD 请求全部返回 200。
- 浏览器交互验收：通过。线上标题正确，主画卷加载宽度为 19207；点击微光提示后缩放至 125% 并定位斗笠，点选后发现进度从 0/6 更新为 1/6。线上截图保存在工作区 `outputs/github-pages-preview.jpg`。
- 本轮为部署后的针对性检查；完整三卷、手机视口与百科流程沿用上一轮已通过的本地验证，实体触屏与跨浏览器尚未补测。

## 参考

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages 创建接口](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site)

## 当前结果

公开仓库、完整历史同步及 GitHub Pages 部署已完成，线上首页、主要静态资源、画卷加载、提示与发现计数检查通过。网站地址为 `https://lep-ton.github.io/bianjing-scroll/`，部署运行编号为 `43719089456`。后续仅修改文档的提交不触发网站重新部署。
