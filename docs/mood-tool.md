# 情绪日记与自我关怀

固定入口：`https://www.estevancyber.net/mood/`。导航「工具 → 情绪日记」。

## 产品边界

- 记录：五档心情、精力、具体情绪、影响因素、时间和可选文字；支持编辑、删除。
- 回顾：近 7/30/90 天真实数据、每日平均值、触发因素出现频率；无记录日期留白，不做心理诊断或因果判断。
- 关怀：可暂停的五分钟温和呼吸、逐步感官觉察、轻运动建议、本站自托管 CC0 音乐。
- 隐私：无账户，无日记 API，无 AI 上传；本地存储未加密。仅本浏览器、同源可见，清理数据会丢失。支持 JSON 导出、校验后合并导入、确认后清空。

## 设计与架构

沿用 Hugo + PaperMod，不为一个工具引入服务器、数据库或前端框架。界面采用浅色手账方向，沿用网站字体和青绿设计令牌；三页签分离记录、回顾、练习。桌面主次栏、手机纵向布局，支持主题切换、键盘操作和减少动态效果偏好。

`content/mood.md` → `layouts/_default/mood.html` → Hugo 指纹化 CSS/JS → Nginx → Cloudflare。

`assets/js/mood-core.js` 负责数据验证、合并、本地日期边界、统计和规则建议；`mood-app.js` 负责 DOM、持久化和练习。日记文字只通过 `textContent` 渲染。导入文件限制 5 MB、10000 条，坏数据不写入；本地存储损坏时停止写入并允许导出原始数据。

存储键为 `estevancyber.mood.v1`，格式为 `{ "version": 1, "entries": [...] }`。站点别名的浏览器存储互相隔离，因此长期使用时建议固定在 www 域名。备份含私人内容，未经加密，不要提交 GitHub。

## 内容依据

- [WHO：Doing What Matters in Times of Stress](https://www.who.int/europe/publications/i/item/9789240003910)
- [NHS：Breathing exercises for stress](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/)
- [NHS：Stress self-help guide](https://selfhelp.cntw.nhs.uk/self-help-guides/stress/print/391)

设计推导：减少记录负担、不给情绪贴病理标签、把建议变成当下可操作练习，并清晰告知本地数据边界。未开展用户访谈，不将这些设计假设包装成已验证用户研究。

## 更新与验证

修改模板或资源后执行 `node --test tests/*.test.js`、Hugo 生产构建；独立构建目录避免与预览服务器相互覆盖。通过现有发布脚本备份后替换站点，无需新端口、DNS 或证书。

浏览器验收覆盖：新增与刷新持久化、编辑/删除、导入导出、损坏备份不覆盖、空状态、呼吸暂停/重置、音乐加载、桌面/手机无溢出、公开链接无需登录。
