# dsh-withssh

> 一个把 AI 协作、真实 SSH 终端和操作痕迹放在同一页面的运维工具。

`dsh-withssh` 是 [DeepSeek Harness](https://github.com/deepseek-harness/deepseek-harness) 的 SSH 运维插件。它用于日常服务器巡检、故障排查和远程操作：在当前 AI 对话中连接一台服务器，人工和 AI 都可以执行命令，并且每一步的命令、返回日志和操作来源都能看见。

它不是替代 SSH 权限体系的自动化执行器，也不是第二个聊天窗口。它是一个让运维人员能够控制、观察和复盘 AI 参与服务器操作的可视化控制台。

![SSH 控制台总览](docs/images/ssh-console-overview.png)

## 适合谁用

- 运维、SRE、平台工程师，需要在服务器上做巡检、日志排查、资源检查或日常维护。
- 后端和开发人员，需要一边与 AI 讨论问题，一边在同一对话中核验远端命令的真实结果。
- 团队负责人或值班人员，需要明确区分哪些操作由人工执行，哪些操作由 AI 建议并执行。
- 不希望把 SSH 密码放进 AI 上下文、会话记录或插件持久化配置的用户。

## 能做什么

| 运维任务 | 在 `dsh-withssh` 中的做法 |
| --- | --- |
| 查看服务器是否异常 | 左侧查看 CPU、负载、内存、交换区和运行时间；在终端执行 `top`、`free`、`df`、`systemctl` 等命令。 |
| 排查日志与服务 | 让 AI 执行日志搜索或服务状态命令，直接查看终端回显，再根据返回结果继续追问。 |
| 检查算力或进程占用 | AI 执行 GPU、NPU、进程或端口查询，结果同时显示在终端和 AI 对话中。 |
| 浏览服务器目录 | 在右下只读文件树查看 `/` 下的目录、文件名、大小和修改时间。 |
| 人机协同操作 | 人工随时在真实 PTY 终端输入命令；AI 只在当前会话已连接时使用 `ssh_exec`。 |

## 一次运维协作如何进行

1. 在一个 DeepSeek Harness 对话中建立 SSH 连接，并核对服务器 Host Key 指纹。
2. 你可以直接输入人工命令，例如查看服务、读取日志、切换目录或运行诊断脚本。
3. 也可以直接告诉 AI“检查这台机器为什么负载高”或“确认加速卡是否被占用”。
4. AI 通过 `ssh_exec` 执行命令，终端立即出现命令和远端回显；AI 对话也收到标准输出、错误输出和退出码。
5. 你根据真实日志决定下一步，或继续让 AI 分析。整个过程保留在当前对话的终端和工具记录中。

## 命令与日志如何区分

| 操作者 | 终端中的样式 | 你能看到什么 |
| --- | --- | --- |
| 人工 | 原始 prompt 中的命令文字为蓝色 | 你的命令通过当前会话的持久 PTY 执行，远端回显继续写入终端。 |
| AI | 原始 prompt 中的命令文字为黄色，后面有 `?` | 点击 `?` 展开 AI 必填的中文命令说明；标准输出、错误输出和退出码显示在终端中，并作为 `ssh_exec` 结果回到 AI 对话。 |

黄色和蓝色只用于标明命令来源，不会改变正常终端输入方式，也不会把命令变成无法复制的展示卡片。终端输出可滚动查看。

![AI 命令、中文说明与终端回显](docs/images/ai-command-explanation.png)

AI 的 `ssh_exec` 调用与结果也保留在对话记录中，因此可以追溯 AI 运行了什么命令、服务器返回了什么、以及 AI 基于什么结果给出结论。

![对话中的 ssh_exec 调用和结果](docs/images/conversation-tool-trace.png)

## 控制台布局

- 顶栏显示当前对话的连接状态和最近 AI 操作。一个 Harness 对话至多拥有一个 SSH 连接；切换对话时会先提醒，确认后才关闭原连接。
- 左侧是服务器概览，包括主机、账号、Host Key 指纹、CPU、负载、内存、交换区和运行时间。
- 右上是可滚动的真实终端。人工输入使用持久 PTY；AI 命令和返回结果也会写入同一终端流。
- 右下是从 `/` 开始的只读文件树与目录表格，显示名称、修改时间、类型和大小。
- 未配置 SSH 的对话只显示连接表单，不显示服务器状态、终端或文件列表。

## 从 GitHub 安装并使用

前提：已经安装可用的 DeepSeek Harness，并能在命令行使用 `dsh`。不需要先克隆本仓库，也不需要在 Harness 源码目录中开发。

以下命令将插件直接加入 Harness 的 `web` 配置档：

```sh
dsh plugin --profile web add github:lhwu1/dsh-withSsh
```

安装过程会使用仓库提交的预构建 `lib/` 文件。首次安装不需要访问 `D:/harness-lh-int8` 或其他本地开发路径。

检查组合是否加载了插件：

```sh
dsh --profile web --dump-config
```

输出中应包含 `dsh-withssh` 和 `dsh-withssh-web`。之后启动 Web 表层：

```sh
dsh --profile web --port 3080
```

在浏览器打开 `http://127.0.0.1:3080/`，进入一个对话，选择 `SSH 控制台` 标签页。

连接步骤：

1. 输入主机、端口、账号和密码，点击“连接服务器”。
2. 插件返回 `sha256:...` 主机密钥指纹后，与服务器管理员或可信记录核对。
3. 指纹确认无误后，再点击“确认并连接”。
4. 在右上终端直接输入人工命令，按 Enter 执行；按 Shift+Enter 换行。
5. 在对话中提出服务器操作需求。当前会话已连接时，AI 会知道 `ssh_exec` 可用，并会在需要时执行带中文说明的命令。

AI 工具调用的预期参数如下：

```json
{
  "command": "/usr/local/hyhal/bin/hy-smi",
  "description": "再次查看加速卡占用情况，确认是否存在正在运行的计算任务"
}
```

`description` 必须包含中文。它不会发送到远端 shell，点击黄色命令后的 `?` 才会在终端中展开显示。

## 更新与卸载

更新 GitHub 安装的插件：

```sh
dsh plugin --profile web update dsh-withssh
```

更新后重启运行中的 Harness，并强制刷新浏览器页面。卸载插件：

```sh
dsh plugin --profile web remove dsh-withssh
```

如果没有看到 `SSH 控制台` 标签，先运行 `dsh --profile web --dump-config` 检查两个插件条目，再重启 Harness。不要同时运行多个指向同一配置档的 Harness 实例。

## 安全行为

- 密码仅短暂经过连接请求、插件进程内存和 `ssh2` 连接配置；连接建立或失败后，插件维护的凭据租约会被清理。密码不写入模型参数、动态上下文、Session 事件、终端历史或持久化文件。
- 首次连接不会自动信任主机密钥，必须由用户确认 SHA-256 指纹。
- AI 命令中的常见高风险模式，例如递归删除、格式化磁盘、关机、重启和危险权限修改，会请求 Harness 审批。人工终端输入仍由操作者负责。
- 远端输出限制为 256 KiB，移除 ANSI/OSC 控制序列，并遮蔽常见 `password`、`secret` 和 `token` 赋值形式；这不是完整的秘密检测系统。
- 文件浏览器只读，不提供文件内容读取、上传、写入或删除操作。

## 限制

- 该插件依赖 Harness Web 表层的同源访问模型，本身没有额外账号认证或 CSRF token。不要把 Web 端口暴露给不受信任的网络；生产环境应使用受保护的本地访问或 TLS 与反向代理认证。
- 文件树可列出 SSH 账号有权限读取的目录名称、大小和修改时间，这些元数据可能敏感。
- `ssh_exec` 的输出会成为 AI 的工具结果。即使终端输出做了常见遮蔽，也应避免执行会打印真实密钥、令牌或密码的命令。
- AI 使用独立 SSH `exec` 通道，人工 PTY 的当前目录和环境变量不会自动同步。AI 长时间命令目前没有单独的取消按钮或执行超时。
- 终端是有限的 PTY 转发和轮询刷新，不等同于完整 xterm.js 仿真。重启 Harness 会清理内存中的 SSH 连接。

## 本地开发

本地开发配置中的 TypeScript 类型路径指向相邻的 Harness 源码检出，因此先把两个仓库放在同一个父目录中：

```text
workspace/
  deepseek-harness-master/
  dsh-withSsh/
```

然后构建：

```sh
git clone https://github.com/lhwu1/dsh-withSsh.git
cd dsh-withSsh
npm install
npm run validate
```

完成构建后，使用本地目录接入 Harness：

```sh
dsh plugin --profile web add D:/path/to/dsh-withSsh
```

本插件只通过 `cordis.patch.yml` 注入自身的 Host 服务、Web 路由和客户端视图，不修改 DeepSeek Harness 主体源码。

## 许可

插件代码使用 [MIT License](LICENSE)。截图中的服务器地址和 Host Key 已做脱敏处理。
