# Word Power 2026-11-19 审计报告

## 1. 结论摘要

- 已审计全部 **507** 个词条；每个词条都有机器可读记录（`audit.json`）。
- 线上旧版缺口：**95** 条无 IPA、**373** 条无构词分析；当前源码与修复后版本均为 **0 / 0**。
- 发音：**459** 条获得词典直接来源或 Wiktionary 交叉核对，其中 **27** 条明显误读已更正；**48** 条保留原有宽式转写并标记为未独立核验。
- 词源/构词：**69** 条已逐条核对并记录来源；**438** 条仍为教学式分析，明确标记为 `PLAUSIBLE_BUT_UNVERIFIED`。
- 共修正 **85** 个词条的内容（27 条 IPA + 61 条词根/词源，含少量重叠），并为 **365** 条 CMU 转写补充了审计来源链接。
- 未发现结构性错误：507 个词全部可检索、分组完整、嵌入 JSON 与外部 JSON 一致。

> 重要区分：IPA “已核对”指与检索到的词典页面或 Wiktionary 英语词条交叉比对，不等于音频听辨测试；词源 “已验证”指词根/来源说明有直接来源，不等于整词历史借入路径已完整重建。

## 2. 线上与源码差异诊断

2026-11-19 抓取线上页面与 `lexicon.json` 后得到：

| 指标 | 线上 | 最新源码 |
|---|---:|---:|
| 词条 | 507 | 507 |
| 缺 IPA | 95 | 0 |
| 缺构词 | 373 | 0 |
| 有独立 IPA 来源 URL | 0 | 94（审计前） |

### 根因

GitHub Pages 的 `/word-power/` 路径被**另一个项目仓库**占用：

- 用户站点仓库：`XYavecasdf/XYavecasdf.github.io`，`main` 分支，部署成功（最近部署提交 `df0729e`，2026-11-17）。
- 项目站点仓库：`XYavecasdf/word-power`，也有 GitHub Pages；其最后一次提交 `8d91624` 是 2026-11-15。
- 线上 `/word-power/` 的 `Last-Modified` 为 **2026-11-15**，与项目仓库一致；而用户站点根路径为 2026-11-17。
- 用户站点中确实存在 `word-power/release-20261116/`，但线上该路径返回 **404**，说明 `/word-power/` 并未由用户站点提供。

因此，旧部署不是 GitHub Actions 失败，而是**路径遮蔽（project site shadowing）**。最小修复是把已验证的最新 `index.html` 与 `lexicon.json` 同步到实际承载该 URL 的 `XYavecasdf/word-power` 仓库，而不是改写用户站点的部署配置。

## 3. 审计方法

1. 用 Wiktionary MediaWiki API 拉取全部 507 个英语词条的 wikitext（2026-11-19）。
2. 解析 `{{IPA|en|...}}` 模板，区分 General American、US、unmarked、RP 等口音标签。
3. 对 502 个词条抓取 Cambridge Dictionary 美式发音页（通过文本读取服务绕过 Cloudflare；403/429 的页面不当作已核对）。
4. 对原有 94 个 `ipa_url` 逐条重查；区分 200、403（反爬）、429（限流）与真正 404。
5. 用规范化后的音素串、主重音位置、音节数比较现有 IPA 与来源 IPA；仅对**主重音、音节数或明显音段错误**做更正，元音/儿化/长短音等宽式变体保留并记录。
6. 对 44 个“词根只有词缀”的词条，用 Wiktionary 词源段落核对并补齐实词词根；另补 17 个复合词的缺失词根。
7. 中文释义逐条人工快速复核；未发现需要立即更正的明显误译，但未做独立双语词典逐条对校。
8. 用无头 Chrome + CDP 做真实浏览器测试（渲染、搜索、词卡、IPA、构词、来源链接、语源筛选、390px 移动布局）。

## 4. 修正明细

### 4.1 IPA（27 条）

| 词 | 旧 | 新 | 依据 |
|---|---|---|---|
| atheism | `/əˈθaɪsəm/` | `/ˈeɪθiɪzəm/` | Cambridge US |
| beneficent | `/ˌbɛnəˈfɪʃənt/` | `/bəˈnɛfɪsənt/` | Cambridge US |
| penurious | `/ˌpɛnˈjuɹiəs/` | `/pəˈnjʊriəs/` | Cambridge US |
| philanthropist | `/fəˈlænθɹəpəst/` | `/fɪˈlænθrəpɪst/` | Cambridge US / Oxford |
| misogyny | `/ˈmɪzədʒɪni/` | `/mɪˈsɑdʒəni/` | Cambridge US |
| homophone | `/ˈhoʊmoʊˌfoʊn/` | `/ˈhɑməfoʊn/` | Cambridge US |
| psychiatrist | `/səˈkaɪətɹəst/` | `/saɪˈkaɪətrɪst/` | Cambridge US |
| genocidal | `/ˈdʒɛnəˌsaɪdəl/` | `/ˌdʒɛnəˈsaɪdəl/` | Cambridge US |
| introspect | `/ˈɪntɹəˌspɛkt/` | `/ˌɪntrəˈspɛkt/` | Cambridge US |
| preamble | `/pɹiˈæmbəl/` | `/ˈpriæmbəl/` | Cambridge US |
| simulate | `/ˈsɪmjələt/` | `/ˈsɪmjəleɪt/` | Cambridge US |
| osteopath | `/ˈɑstiəpæθ/` | `/ˈɑstioʊpæθ/` | Cambridge US |
| egotist | `/ˈiɡətɪst/` | `/ˈiɡoʊtɪst/` | Cambridge US |
| psychoanalysis | `/ˌsaɪkoʊəˈnæləsəs/` | `/ˌsaɪkoʊəˈnæləsɪs/` | Cambridge US |
| introvert | `/ˈɪntɹoʊˌvɝt/` | `/ˈɪntrəvɝt/` | Wiktionary GA |
| appendicitis | `/əˌpɛnˌdɪˈsaɪtɪz/` | `/əˌpɛndəˈsaɪtɪs/` | Cambridge US |
| analysis | `/əˈnæləsəs/` | `/əˈnæləsɪs/` | Wiktionary GA |
| genesis | `/ˈdʒɛnəsəs/` | `/ˈdʒɛnəsɪs/` | Wiktionary |
| intrepid | `/ɪnˈtɹɛpəd/` | `/ɪnˈtrɛpɪd/` | Wiktionary |
| neurosis | `/nʊˈɹoʊsəs/` | `/nʊˈɹoʊsɪs/` | Wiktionary GA |
| epidermis | `/ˌɛpəˈdɝməs/` | `/ˌɛpəˈdɝmɪs/` | Wiktionary GA |
| opera | `/ˈɑpɹə/` | `/ˈɑpəɹə/` | Wiktionary GA |
| psychosis | `/saɪˈkoʊsəs/` | `/saɪˈkoʊsɪs/` | Wiktionary GA |
| intrepidity | `/ˌɪnˈtɹɛpɪdəˌti/` | `/ˌɪntɹəˈpɪdəti/` | Cambridge US |
| orthodontist | `/ˌɔɹθəˈdɑntəst/` | `/ˌɔɹθəˈdɑntɪst/` | Wiktionary |
| zoologist | `/zoʊˈɑlədʒəst/` | `/zoʊˈɑlədʒɪst/` | Wiktionary GA |
| urbane | `/ɚˈbeɪn/` | `/ɝˈbeɪn/` | Cambridge US |

另将 43 条 IPA 中的 ASCII `r`/`g` 统一为 IPA `ɹ`/`ɡ`；不改变音位。

### 4.2 词根/词源（61 条）

典型修正：

- `adolescent`：用拉丁语 `adolescere`（成长）替换不恰当的 `-escent`。
- `entomology`：改为希腊语 `entomon`（昆虫；字面“切开的”）+ `temnein`（切），并注明不能按现代英语 `en- + -tomy` 理解。
- `philanthropist`：补 `philos`（爱）+ `anthropos`（人），不再只列 `-ist`。
- `suicide`：补 `sui`（自己的）+ `caedo`（杀）。
- `analysis` / `epilogue` / `prologue` / `telegraph` / `telepathy` / `telescope`：补 `lysis` / `logos` / `graphein` / `pathos` / `skopein` 等实词词根。
- `autonomous` / `autonomy` / `democracy` / `monarchy` / `octopus` / `manuscript` / `omnipotent` 等：补齐复合词的另一半词根。

共 61 个词条的 `roots` 与 `origin_note` 被更新；所有新增说明都附有 Wiktionary 词源链接。

### 4.3 来源标注

- 365 条原为 CMU 转写的词条，在 2026-11-19 与 Cambridge/Wiktionary 交叉核对一致后，补充了 `ipa_url` 与明确的交叉核对说明。
- 全部 507 条保留 `wiktionary_url`；487 条现有直接 `ipa_url`。
- 新增 `audit.json`，逐条记录来源 URL、支持的主张、状态、置信度、问题与变更。

## 5. 修复后统计

| 指标 | 数值 |
|---|---:|
| 总词条 | 507 |
| 缺 IPA | 0 |
| 缺构词分析 | 0 |
| IPA 已验证/更正 | 459（432 VERIFIED + 27 CORRECTED） |
| IPA 仍为宽式未独立核验 | 48 |
| 词源/词根已验证 | 69 |
| 词源仍为教学式分析 | 438 |
| 内容修正词条 | 85 |
| 补充来源链接词条 | 365 |
| 完全 VERIFIED 记录 | 67 |
| 部分 VERIFIED 记录 | 394 |

`CONFLICTING_SOURCES` 为 0；但仍有 2 个**来源变体**需要说明：

- `barometric`：现有 `/ˌbæɹəˈmɛtɹɪk/` 与 Cambridge `/ˌbɛroʊˈmɛtrɪk/` 的 `-baro-` 元音不同，均可见于不同词典传统。
- `nautical`：现有 `/ˈnɔtəkəl/` 与 Cambridge `/ˈnɑtɪkəl/` 属 cot–caught 元音差异。

这两条保留现有宽式转写，在 `audit.json` 中标记为 `PLAUSIBLE_BUT_UNVERIFIED` 并记录来源差异。

## 6. 未完成与限制

1. **词源深度**：438 条仍为教学式词根拆解；已核对的是词根/来源，不是每个词的完整借入链（例如法语中转、语义演变年代）。
2. **IPA 剩余 48 条**：多为罕见词、Cambridge 无发音页或只有音频的条目；保留现有 CMU 宽式转写，未用猜测替换。
3. **中文释义**：507 条均非空、含汉字、语义抽检无明显误译；但没有逐条对照权威英汉词典，`audit.json` 统一标为 `PLAUSIBLE_BUT_UNVERIFIED`。
4. **来源访问**：Cambridge/Oxford/Collins 对自动化请求返回 403/429；审计通过文本读取服务取得内容，未把 403 当作“已核对”。部分链接在普通浏览器中可能仍需人工验证。
5. **API 预算**：本次主要使用确定性抓取、解析和本地脚本，未调用外部语言模型生成 IPA 或词源；因此没有可报告的 DeepSeek token 账单。无法从本会话精确读取账户余额/实际扣费，预算报告只能给出“未测到额外模型调用”的结论，不能保证账单金额。

## 7. 复现

```sh
cd word-power

# 结构、计数、IPA 格式、嵌入数据一致性
python tools/validate_lexicon.py

# 嵌入 JSON 是否最新
python tools/sync_embedded.py --check

# 审计记录重建（需要审计缓存；缓存不随公开仓库分发）
python tools/build_audit.py \
  --wiktionary-ipa ../../audit-cache/wikt_ipa.json \
  --dictionary-cache ../../audit-cache/dict-pages

# 真实浏览器测试
python -m http.server 8765 --bind 127.0.0.1
node tools/browser_test.mjs --url http://127.0.0.1:8765/word-power/
```

浏览器测试实测结果（2026-11-19）：507 个词条、679 个词实例、243 个词根分支、8 个语义组；搜索 `atheism` 返回 1 条；词卡显示 `/ˈeɪθiɪzəm/`、3 个构词成分、Cambridge 与 Wiktionary 链接；`philanthropist` 显示新增的 `philos` / `anthropos` 词根；古希腊语筛选返回 296 个词实例；390px 视口无横向溢出、侧栏隐藏。
