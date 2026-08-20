# dsh-withssh

`dsh-withssh` 是 DeepSeek Harness 的会话级 SSH 控制台插件。它在当前对话页面内嵌 FinalShell 风格的工作区：左侧显示服务器状态，右侧上方显示可滚动终端，右侧下方显示只读文件树和目录表格。每个 Harness 会话最多拥有一个 SSH 连接；切换会话时页面会先提醒，确认后才关闭原会话连接。

## 功能

- 浏览器中输入主机、端口、账号和密码，建立当前对话专属的 SSH 连接。
- 首次连接返回 SHA-256 主机密钥指纹，用户核对后再次确认；插件不会自动信任未知主机。
- 人工终端使用持久 PTY，可直接输入命令并查看实时回显。
- AI 通过 `ssh_exec` 执行命令。AI 命令显示为黄色，人工命令显示为蓝色，二者都出现在原始终端位置。
- AI 命令必须提供中文 `description`。命令后的 `?` 只用于展开查看含义，说明不会发送到远端终端。
- 已连接状态会通过 Harness 的动态系统上下文告知模型主机、端口、账号和 `ssh_exec` 可用性；密码和主机密钥不会进入模型上下文。
- 左侧显示 CPU、负载、内存、交换区和运行时间；右下从服务器 `/` 开始浏览一级目录，并显示名称、修改时间、类型和大小。
- 文件面板只读，不提供远端文件内容读取、上传、写入或删除操作。

## 安装

前提是已经安装可用的 DeepSeek Harness，并能使用 `dsh` 命令。下面以 `web` 配置档为例；使用其他配置档时替换 `web`。

从 GitHub 安装：

```sh
dsh plugin --profile web add github:<owner>/dsh-withssh
```

本地开发目录安装：

```sh
dsh plugin --profile web add D:/harness-lh-int8/dsh-withSsh
```

安装后检查组合配置：

```sh
dsh --profile web --dump-config
```

输出中应包含 `dsh-withssh` 和 `dsh-withssh-web`。首次从不受信任的 npm 或 Git 仓库安装时，只有在确认代码来源后，才按 Harness 提示允许构建该包。

## 启动与连接

启动 Web 表层：

```sh
dsh --profile web --port 3080
```

打开 `http://127.0.0.1:3080/`，进入任意对话。对话页面中没有 SSH 配置时只显示连接表单，不会显示服务器状态、终端或文件树。

连接步骤：

1. 输入主机、端口、账号和密码，点击“连接服务器”。
2. 仔细核对插件返回的 `sha256:...` 主机密钥指纹；不要只根据主机名确认。
3. 确认指纹后再次点击“确认并连接”。
4. 连接成功后，人工命令可在终端输入框中执行；AI 会在模型回合中使用 `ssh_exec`。

AI 工具调用示例：

```json
{
  "command": "pwd",
  "description": "显示当前远端工作目录，用于确认 SSH 会话所在路径"
}
```

点击 AI 命令后的 `?` 可展开中文解释。工具返回的标准输出、错误输出和退出码会回到模型，并同时出现在终端流中。

## 安全边界

- 密码只在连接请求、插件进程内存和 `ssh2` 连接配置中短暂存在；连接建立或失败后会清理插件维护的凭据租约。密码不写入模型参数、动态上下文、Session 事件、终端历史或持久化文件。
- 主机密钥必须由用户核对。插件不会把首次看到的指纹自动保存为可信值。
- AI 命令中的高风险模式（例如递归删除、格式化磁盘、关机、重启和危险权限修改）会请求 Harness 审批；未获一次性批准不会执行。人工终端输入仍由用户自行负责。
- 远端输出有 256 KiB 上限，并会移除 ANSI/OSC 控制序列和常见 `password`、`secret`、`token` 赋值形式。此遮蔽不是完整的秘密检测机制。
- 会话路由要求显式 `sessionId`，响应禁止缓存；连接、统计、文件和输入路由分别限制为预期的 HTTP 方法。

## 已知限制与风险

- 密码在 HTTPS/本地 HTTP 请求到达插件前会经过浏览器和 Web 服务器；生产环境应使用受保护的本地访问或 TLS。插件本身没有额外的账号系统、CSRF token 或反向代理认证层。
- 只要能访问同一个 Harness Web 表层的同源客户端，就可能调用带有已知 `sessionId` 的插件路由。不要把 Web 端口暴露到不受信任的网络。
- 文件树可以列出 SSH 账号有权限读取的任意目录的名称、大小和修改时间；这些元数据可能敏感。插件不会读取文件内容。
- AI 收到的 `ssh_exec` 输出可能包含业务秘密，这是远端命令语义的一部分；使用命令时应避免输出密钥、令牌和密码。
- AI 执行使用独立 SSH `exec` 通道，人工 PTY 的当前目录和环境变量不会自动同步给 AI。长时间命令目前没有独立的取消按钮或执行超时。
- 终端输出采用轮询刷新和有限的 PTY 转发，不等同于完整 xterm.js 仿真。重启 Harness 会清理内存中的 SSH 连接。

## 本地开发与更新

```sh
cd D:/harness-lh-int8/dsh-withSsh
npm install
npm run typecheck
npm run build
npm run validate
```

更新已安装插件：

```sh
dsh plugin --profile web update dsh-withssh
```

本地修改后重新执行 `npm run validate`，再更新插件并重启 Harness。插件只通过 `cordis.patch.yml` 注入自身的 Host、Web 路由和客户端视图，不修改 DeepSeek Harness 主体源码。

## 许可

插件代码使用 [MIT License](LICENSE)。
