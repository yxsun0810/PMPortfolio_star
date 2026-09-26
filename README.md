# PMPortfolio_star

Star 的数据产品经理作品集，首页以四个项目卡为入口：数据接入与流通工作台、数仓前台、天气数据产品、生产分析台。每个项目有独立的案例详情页和独立体验 Demo。数据接入与天气案例的简短交互片段仍放在各自的详情页中。

在线浏览：[GitHub Pages 作品集](https://yxsun0810.github.io/PMPortfolio_star/)；四个独立演示页分别是 [`intake-demo.html`](https://yxsun0810.github.io/PMPortfolio_star/intake-demo.html)、[`catalog-demo.html`](https://yxsun0810.github.io/PMPortfolio_star/catalog-demo.html)、[`weather-demo.html`](https://yxsun0810.github.io/PMPortfolio_star/weather-demo.html) 和 [`production-demo.html`](https://yxsun0810.github.io/PMPortfolio_star/production-demo.html)。项目详情位于 `projects/`。页面不依赖第三方网络字体、脚本或图片。

## 内容口径

- 案例依据本人工作资料整理，使用“参与”等与资料相符的职责表述。
- 企业品牌、内部系统地址、真实数据、源文件、账号与凭据未收录。
- 页面中的流程为重新绘制的概念示意；“300 多个城市”是公开版的概数。
- 详情页交互片段与四个独立 Demo 使用浏览器内的合成输入与示例规则，不连接生产系统，也不代表真实业务执行结果。
- 数据接入 Demo 保留现有工作台的六区信息架构与主要判断路径；预检与登记是合成批次回放，不读取本机文件，也不提供生产写入。
- 数仓前台 Demo 的数据集、字段与接口地址均为公开演示用的合成名称；生成命令不含真实令牌。
- 天气 Demo 按城市、日期、指标和事实类型组织“购物车”；天气值、图表与问句识别均为浏览器内合成演示。生成的是非可执行的只读取数需求说明，不复用数仓前台口令。
- 生产分析 Demo 展示合成异常的证据核对、人工跟进、到期提醒和源条件解除；排期与采购入库为合成只读案例。它不是正式系统的逐像素副本，不发送通知、不写业务源表，也不复用正式组件、登录或数据。
- 未提供无法从资料核实的业务增长数字。

## 本地预览

用浏览器打开 `index.html`，从项目卡进入各详情页。首页导航随滚动标记当前位置，明暗主题选择保存在本机浏览器。GitHub Pages 从默认分支根目录发布。

