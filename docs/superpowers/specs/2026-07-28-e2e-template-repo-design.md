# e2e-autopilot-template：一个系统一个项目的分发方案

日期：2026-07-28
状态：已批准，待实现

## 问题

同事需要用这套 e2e 工具测他们各自的系统。当前只有一个仓库 `brookerfhh/e2e-autopilot`，
里面混着通用工具和 Cookbook 专属产物。让同事进这个仓库意味着要发提交权限，且他们会看到
一堆与自己系统无关的 Cookbook 测试。

目标：每个被测系统一个独立项目，同事自助获取，不发任何提交权限。

## 方案：GitHub Template Repository

新建 `brookerfhh/e2e-autopilot-template`（个人账号，public，勾选 Template repository）。
同事点 "Use this template" 在自己账号下生成新仓库，他们是 owner，无需任何授权。

现有 `e2e-autopilot` 保持不动，继续作为 Cookbook 的实际项目。

### 为什么用全新 orphan 历史

template 内容必须以单个 initial commit 提交，不携带 `e2e-autopilot` 的历史。

`git rm` 只删当前快照，文件仍留在历史里。若 clone 现仓库后删除 Cookbook 部分再推送，
任何人对这个 public 仓库执行 `git log -p` 都能翻出 `PAGES.md` 的完整页面结构和
`cookbook.foodtruck-qa.com`。orphan 历史是让「public」与「不泄露内网信息」同时成立的
唯一做法，而既然不需要与上游做 merge，保留历史本来也没有收益。

## 仓库边界

进入 template（通用层）：

```
.claude/skills/
  flow-kit/            SKILL.md + templates/(_auth.ts, _run.ts, tsconfig.flows.json, FLOWS.template.md)
  build-flow/          SKILL.md + templates/FLOWS.template.md
  prepare-data/        SKILL.md
  regression-add-page/ SKILL.md + PAGES.md（空白格式模板）
scripts/
  test-auth/           inject-session.ts, save-auth.ts, README.md
  regression/          fixtures.ts, run.cmd
playwright.config.ts
package.json / tsconfig.json / tsconfig.scripts.json
login.cmd
.gitignore
README.md（重写）
```

不进入 template：12 个 `*.spec.ts`、12 个 `pages/*.ts`、`tests/*.md`、
`scripts/regression/README.md`（59 用例清单）、`PAGES.md` 的 Cookbook 内容、
`cb-knowledge/`、`flows/`。

同事开出的新仓库能立刻 `npm install` 跑通，四个 skill 齐备，`scripts/regression/`
是只有 `fixtures.ts` 的空壳，等 `/regression-add-page` 往里填。

`fixtures.ts` 和 `run.cmd` 判定为通用，保留。`PAGES.md` 保留为空白模板而非删除，
因为 `regression-add-page/SKILL.md` 写明会先查它，文件缺失会让 skill 走岔。

## 需要改写的 6 处

| 文件 | 现状 | 改成 |
|---|---|---|
| `scripts/test-auth/inject-session.ts:40` | `DEFAULT_QA_URL = "https://cookbook.foodtruck-qa.com"` | 去掉默认值，未设 `APP_URL` 抛错 |
| `scripts/test-auth/save-auth.ts:21` | `process.env.APP_URL \|\| "https://cookbook.foodtruck-qa.com"` | 同上 |
| `.claude/skills/build-flow/SKILL.md:41` | "if the app isn't the default Cookbook QA" | 改为「必须设 `APP_URL`」 |
| `.claude/skills/build-flow/SKILL.md:73` | 内联 node 脚本兜底 cookbook 域名 | 去掉兜底 |
| `.claude/skills/regression-add-page/SKILL.md:30,123` | "defaults to Cookbook QA"、拿 `/ItemV2` 举例 | 泛化措辞 |
| `.claude/skills/regression-add-page/PAGES.md` | 118 行 / 15 个 Cookbook 页面 | 清空为格式模板 |

### 取舍：缺 APP_URL 即报错，不用占位符域名

```typescript
const APP_URL = process.env.APP_URL
if (!APP_URL) {
  throw new Error('APP_URL not configured — set it to your app origin, e.g. https://your-app.example.com')
}
```

占位符 `your-app.example.com` 会让人撞上 DNS 失败、自己猜哪儿错了；显式报错一句话说清。
对 template 而言「每个系统必须声明自己是哪个系统」本就该硬性，不该悄悄继承别人的默认值。
与 `~/.claude/rules/security.md` 的 env var 写法一致。

代价：同事开出的仓库比现在多一步配置才能跑。已接受。

## 分发与使用路径

一次性动作（由 Claude 代劳）：建仓库 → 推首个 commit → 勾选 Template repository → 交付链接。

同事路径（零权限、全自助）：

1. 点 "Use this template" → 在自己账号下生成 `e2e-<系统名>`，他们是 owner
2. `npm install && npx playwright install chromium`
3. 设 `APP_URL` 指向自己的系统——不设就报错，不会误连 Cookbook
4. `/flow-kit` 验环境 → `/regression-add-page <url>` 或 `/build-flow <name>` 开始产出

## skills 更新的同步后路

不建独立同步机制。但因为同事仓库与 template 无共同祖先（orphan 历史），
`git merge upstream/main` 不可用，需在 template 的 README 中提供可行命令。

`git checkout` 取单个路径不需要共同祖先——它只从目标 tree 捞文件：

```bash
git remote add upstream https://github.com/brookerfhh/e2e-autopilot-template.git   # 只跑一次
git fetch upstream
git checkout upstream/main -- .claude/skills/
git commit -m "chore: sync skills from upstream"
```

代价：粗暴覆盖，同事对 SKILL.md 的本地改动会被冲掉（能从 diff 看见冲掉了什么，
不会无声丢失）。在「brooker 是唯一 skill 作者、同事只消费」的前提下够用。

### 将来的升级路径

若同步变成常态、或同事开始反向贡献 skills，升级到 Claude Code plugin 机制：
skills 单独一个仓库，同事 `/plugin marketplace add` 装上，`/plugin update` 同步。
届时 template 不再带 `.claude/skills/`，只留脚手架。

从当前结构迁移不需要重做：抽出 skills 目录单独建仓库，template 删掉该目录，同事重装一次。
本方案不锁死这条路。

（plugin 仓库的清单格式在实施时查官方文档确认，不凭记忆写。）

## 明确不做

- 不做 skills 自动同步机制
- 不做 monorepo
- 不建公司 GitHub org
- template 不含任何测试范例（同事只拿到脚手架）

## 实施步骤

1. 在 `e2e-autopilot` 同级新建临时目录造 template 内容——不在当前仓库开 orphan 分支，避免污染工作区
2. 从 `main` 复制通用层文件，应用上述 6 处改写
3. 重写 README（含 APP_URL 配置、四个 skill 用法、skills 同步命令）
4. `git init` + 单个 initial commit
5. 向用户确认最终文件清单与仓库名
6. `gh repo create brookerfhh/e2e-autopilot-template --public`
7. push
8. `gh repo edit --template`
9. 交付链接

第 6、7 步为对外动作（public 仓库全网可见），执行前须经用户确认。
