# 采集包依据与取舍

检索和核对日期：2026-07-17。以下来源用于制定采集伦理、格式与保存原则；它们不替代参与者对本项目作出的具体授权。

## 采用的来源

1. **Oral History Association, “OHA Principles and Best Practices,” 2018 revision.** 该指南强调对讲述者及其社群的尊重、访谈双方持续和协作的关系、权力差异，以及归档和访问安排应在录制前讲清。本包据此把参与自愿、持续撤回入口和不诱导表演放在技术要求之前。  
   https://oralhistory.org/principles-and-best-practices-revised-2018/
2. **Library of Congress, Recommended Formats Statement, Audio Works.** 美国国会图书馆优先接收原生分辨率、未压缩 WAVE/Broadcast WAVE 和完整伴随元数据，并明确原生分辨率优于升采样。本包据此要求保留设备原始文件、拒绝升采样冒充高规格，并把格式信息与录音一起交接。  
   https://www.loc.gov/preservation/resources/rfs/audio.html
3. **International Association of Sound and Audiovisual Archives, TC-04, Guidelines on the Production and Preservation of Digital Audio Objects.** 该指南把从原载体取得信号、无损保存、元数据和长期可验证性视为同一保存链。本包据此区分原始文件和派生文件，并要求处理记录引用原件校验值。  
   https://www.iasa-web.org/tc04/audio-preservation
4. **Digital Preservation Coalition, Technology Watch Report: Preserving Moving Picture and Sound.** 该报告概述数字音视频保存中格式、元数据、校验与多副本管理的共同风险。本包据此把 SHA-256、独立副本和接收端复核写成现场清单。  
   https://www.dpconline.org/docs/technology-watch-reports/2476-preserving-moving-picture-and-sound/file

## 本项目的实际取舍

- 美国国会图书馆对成品高分辨率音频给出 96 kHz / 24 bit 或更高的优选级别；本项目面向普通手机和便携录音机，首采以 **WAV、48 kHz、24 bit** 为可执行优选。更重要的门槛是原生分辨率、无损或设备最高质量导出，以及绝不把升采样文件冒充原件。
- 专业指南常以档案机构和受训访谈者为对象。本包将现场说明压缩为环境、距离、试录、文件名和原件保留五件事，但没有删去授权、隐私和校验步骤。
- 三项授权不是外部通用表格的照搬，而是本项目 ADR 0002 的产品约束：网页播放、公开下载、研究复用必须分别控制。
- 说话者背景遵守数据最小化，只收集解释语言差异所需的五类概括信息。任何后续研究希望增加字段，都需重新说明必要性和公开风险，不能在采集现场随意扩表。

## 排除的做法

- 未采用网文中的“南京话标准词表”或“正宗南京话测试”，因为它们会预设唯一正确形式，也常缺少可核查采样说明。
- 未把社交媒体、短视频或聊天群里的真人音频当作训练样本或演练素材，因为无法确认录音和传播授权。
- 未要求采集者购买专业设备；设备型号不等于有效授权，也不能替代安静环境和可追溯原件。
