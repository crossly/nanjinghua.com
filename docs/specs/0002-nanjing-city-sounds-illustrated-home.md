# 规格：南京城的声音插画漫游首页

## Problem Statement

现有首页以南京话历史与文化档案为中心组织内容，优先展示档案条目、证据身份、历史脉络与检索入口。它对希望亲近南京城市生活、却不熟悉南京话的年轻读者而言过于机构化和一板一眼；读者在理解城市场景与语言温度之前，先面对编目和核查语言。

项目需要直接以新的首页取代当前档案式首页，成为一个不排外、非官方、可慢慢漫游的个人小站。它的主品牌仍是“南京话”，但要用温和、散文化的叙述让“声音”代指“话”，并让旧资料退到有兴趣时才展开的背景层。

## Solution

将首页改造成“南京话 / 南京城的声音”的原创插画城市漫游。首页是一张受南京启发、但不作为精确地理导览的想象城市切片。读者从十五个日常地点进入短故事；从地图打开时，故事以路由化悬浮窗口出现，直接访问时则是完整、可分享的独立页面。

城市故事以温和城市朋友的口吻讲述日常场景，不把创作性场景伪装成具体个人的亲历，也不出现编辑署名、编辑时间或机构化审核元信息。现有档案条目、专题文章和浏览检索仍可访问，但通过“想再翻一翻”和“旧资料柜”成为次级入口。音乐只作为情绪延伸的官方外链书签，不承载音频播放。

首发先完成整张地图、公交站故事窗与一个“翻翻看”总览样例，供视觉和文风确认；确认后完成其余十四个地点与故事。

## User Stories

1. As a first-time young reader who does not understand Nanjinghua, I want the home page to explain the site through familiar city scenes, so that I can enter without dialect knowledge.
2. As a returning reader, I want to recognize the site as “南京话” with the subtitle “南京城的声音”, so that the new experience retains a clear identity.
3. As a reader, I want the site to describe itself as “一点点关于南京话、城市生活的记忆”, so that it feels personal rather than institutional.
4. As a reader, I want to see an inviting illustrated city on the home page, so that exploring feels like taking a walk rather than using a database.
5. As a reader, I want the city image to evoke Nanjing without claiming to be an accurate map, so that imagination is not confused with navigation.
6. As a reader, I want to discover fifteen clearly identifiable locations on the city image, so that there is enough to revisit without an overwhelming interface.
7. As a reader, I want each location to show a clear interactive affordance, so that I know where a story begins.
8. As a reader, I want a visited location to gain a small visual mark, so that I remember where I have wandered without being scored or gamified.
9. As a desktop reader, I want a location to open in a calm floating story window, so that the city remains present behind the story.
10. As a keyboard reader, I want to close a story window with its close control or Escape, so that the interaction does not depend on a pointer.
11. As a reader using browser navigation, I want Back to return me from a story to the map state I came from, so that normal navigation remains reliable.
12. As a reader who receives a shared link, I want every city story to have its own direct URL, so that I can read it without first opening the map.
13. As a mobile reader, I want a directly opened or map-selected story to use a full reading layout, so that text and controls remain comfortable on a small screen.
14. As a reader, I want each story to begin with a scene and a human feeling rather than a classification or definition, so that unfamiliar language remains approachable.
15. As a reader, I want explanations of unfamiliar words or tones to be contextual and short, so that I am not forced through a dictionary lesson.
16. As a reader, I want the prose to sound like a warm city friend, so that the site invites curiosity without claiming authority over every Nanjing speaker.
17. As a reader, I want city stories to avoid invented named witnesses or fabricated first-person memories, so that their warmth is not mistaken for documentary testimony.
18. As a reader, I want a story with relevant background material to offer an optional “想再翻一翻” section, so that I can pursue detail without having it interrupt the main reading.
19. As a reader familiar with the existing site, I want to reach the existing archive and browse experience through “旧资料柜”, so that useful material remains available.
20. As a reader, I want the archive entry, archive identifier, publication, rights, revision, and API behavior to remain intact, so that the new homepage does not break the archival subsystem.
21. As a reader who prefers browsing lists, I want a “翻翻看” story overview, so that I can find a scene without navigating the map.
22. As a reader, I want the overview and the map to lead to the same story URLs, so that there is one shareable canonical reading destination per story.
23. As a reader, I want an illustrated music bookplate at relevant stories, so that a song can extend the mood after reading.
24. As a reader, I want music links to open an official source rather than start unexpectedly, so that I control whether sound plays.
25. As a reader, I want the site to avoid hosting song files, lyrics, or third-party cover art, so that music recommendations respect rights and the non-audio delivery boundary.
26. As a reader, I want the initial bus-stop story to link to D-Evil’s “挤公交（bonus track）”, so that the first city scene connects to a recognizable shared memory.
27. As a reader, I want the festive street story to be able to link to “Come on！莱斯狗！”, so that an appropriate song supports that scene without defining the entire site.
28. As a reader, I want the interface to use original, consistent illustrations, so that the site reads as one personal visual world rather than a collage of unrelated images.
29. As a reader, I want old maps and existing cultural photographs to appear only as small, credited background discoveries where appropriate, so that they retain their context without taking over the experience.
30. As a reader who prefers reduced motion, I want the city and story transitions to be reduced or removed according to my system preference, so that motion never blocks reading.
31. As a reader on a narrow screen, I want the map and stories to avoid horizontal overflow, so that the experience remains usable on a phone.
32. As a reader using assistive technology, I want the map locations, story controls, and reading order to have clear names and keyboard access, so that the illustrated interface remains understandable without visual pointing.
33. As the site owner, I want the first implementation to include the complete map shell, one polished bus-stop story, and one overview example, so that I can approve the actual visual and editorial direction before fourteen stories are produced.
34. As the site owner, I want the remaining fourteen locations to be created only after the first implementation is approved, so that the illustration system and prose direction can be adjusted once rather than repeated incorrectly.
35. As the site owner, I want the launch set to cover bus stop, alley, small shop, stage, old desk, market, breakfast shop, kitchen, downstairs, school gate, playground, festival street, new housing estate, station, and phone screen, so that the city has both old and contemporary everyday life.

## Implementation Decisions

- The visitor-facing home page is deliberately repositioned from an archive-first landing page to a personal illustrated city-reading experience. The public brand remains “南京话”; its homepage subtitle is “南京城的声音”, where “声音” means spoken language and city expression, not an audio promise.
- Introduce a distinct city-story content model. A city story is not an archive entry, a 专题文章, or a claim of 口述记忆. It carries a title, scene, short prose, illustration, optional contextual phrase cards, optional music bookplate, optional related city stories, and optional source notes.
- Add “城市故事” and “旧资料柜” to the project’s domain vocabulary. “城市故事” is editorial scene writing for public reading; it must not be cited as evidence for a historical or linguistic conclusion. “旧资料柜” is the visitor-facing name for the existing archive and browse material.
- Keep the existing archive, archive identifier, 专题文章, 专题集合, public API, indexing policy, and archive validation contracts unchanged. Links from city stories to archival material are optional supporting context, never a requirement for a story to be readable.
- The map is a stylized, fictionalized city slice inspired by Nanjing’s everyday visual vocabulary. It must not assign an exact real-world coordinate, street, or claim to any illustrated location unless a specific source note says so.
- The launch inventory has fifteen map locations: 公交站、巷口、小店、戏台、旧书桌、菜场、早点铺、厨房、楼下、校门口、操场边、灯会街口、新小区、车站、手机屏幕.
- The first delivery checkpoint contains the full map shell, the 公交站 story, and one “翻翻看” overview example. The other fourteen stories and their final illustrations follow only after owner approval of that checkpoint.
- Map navigation and the story overview share one canonical route for each city story. A map-originated navigation presents the route in a focus-managed modal reading window on desktop; direct navigation renders the same route as a complete reading page. Closing the modal, pressing Escape, and browser Back return a map-originated reader to the map.
- The modal visual language uses a warm paper surface, restrained deep blue-gray outline, brick-red detail, and subtle shadow. It should evoke a well-made desktop window without copying macOS traffic-light controls or introducing fake controls.
- The mobile experience presents city stories as a full reading page rather than a constrained modal. The map becomes a vertically accessible sequence of scene entries or an equivalent touch-friendly treatment.
- Use one original main-map illustration, fifteen scene illustrations, and a reusable set of city objects. Old maps and licensed cultural photographs are supporting discoveries only; their credit and license remain visible whenever they are shown.
- Story prose follows the “温和城市朋友” voice: approachable modern Chinese, brief context for unfamiliar Nanjinghua, no universal claims about all speakers, no fabricated named witnesses, and no visible byline, editorial timestamp, review status, or institution-style editor note.
- The current archive-specific 编辑责任 and 审核状态 requirements remain applicable to archive and existing 专题文章 content. They do not apply to the new city-story form because it makes no evidence-backed historical claim.
- Music bookplates are outbound links to official platform pages or platform-sanctioned embeds only when their terms permit. They do not autoplay, play inline by default, store audio, copy full lyrics, or reproduce third-party cover art. The initial confirmed entries are “挤公交（bonus track）” for 公交站 and “Come on！莱斯狗！” for 灯会街口; other recommendations remain optional and editorially reviewed.
- “翻翻看” is a lightweight illustrated story overview, not a replacement for the existing structured browse form. The existing browse route remains available through “旧资料柜”.
- The homepage may use small, restrained ambient motion such as lights or leaves and a paper-forward modal transition. It must honor reduced-motion preferences and must not use scroll-jacking, persistent parallax, scoring, check-ins, or completion mechanics.
- The home page, city stories, overview, and their metadata must avoid external dependencies that undermine mainland delivery. The existing canonical-host, static delivery, and non-audio constraints continue to apply.
- This is an intentional change to the visitor-facing product framing in `CONTEXT.md` and ADR-0001. During implementation, those documents must be revised to distinguish the retained archival subsystem from the new city-story homepage, while preserving the requirement that archive material and factual conclusions stay source-aware.

## Testing Decisions

- The single highest seam is the browser-visible “城市漫游阅读体验”. Tests must assert a reader-visible route, accessible control, navigation result, or rendered content; they must not assert component structure, hook calls, or CSS implementation details.
- Extend the existing Playwright homepage and accessibility coverage to verify the new brand title and subtitle, a discoverable map entry, the 公交站 story route, and the map-originated modal behavior.
- Verify that selecting 公交站 updates the URL, opens the story window on desktop, traps focus appropriately, and can be closed through the close control, Escape, and browser Back while restoring the map experience.
- Verify that a direct city-story URL renders a complete readable page without requiring a map background, and that the “翻翻看” overview links to that same canonical story URL.
- Verify that the “旧资料柜” entry reaches the existing browse/archive experience and that existing archive page, API, static-delivery, sitemap, and indexing tests continue to pass unchanged in behavior.
- Verify that music bookplates are explicit outbound links and that the city pages introduce no audio or video playback element.
- Run responsive browser checks for desktop and mobile. On mobile, assert a full reading layout and no horizontal overflow; on desktop, assert that the story window is visible and usable above the map.
- Run the existing axe-based accessibility suite against the homepage, city-story route, overview, and an archive route. Add checks for accessible names on map locations, modal semantics, focus restoration, keyboard operation, and reduced-motion behavior.
- Keep existing content-schema unit tests focused on archive entry and 专题文章 contracts. Add targeted validation only for the new city-story content boundary and outbound music-link allowlist/shape if the implementation introduces structured content validation.
- Preserve the repository’s existing typecheck, Biome, content validation, static build, unit, and browser test gates. A successful feature test never substitutes for those release checks.

## Out of Scope

- Public story submission, reader comments, user accounts, likes, game progress, leaderboards, or completion rewards.
- Hosting, streaming, downloading, transcribing, or synthesizing audio; automated playback; lyrics reproduction; and third-party cover-art reuse.
- A geographically accurate Nanjing map, real-time transport data, directions, or location tracking.
- Claiming that a city-story scene is a documented oral account, a linguistic standard, or evidence that every Nanjing speaker uses a form in the same way.
- Replacing, deleting, weakening, or re-identifying the existing archive entries, archive identifiers, source records, editorial policies, or public archive APIs.
- Completing all fifteen final story illustrations before the owner approves the first delivery checkpoint.
- Restyling every existing archive, policy, contribution, recording-kit, or editorial workflow page into the illustrated visual system in this feature.

## Further Notes

- The feature treats “南京城的声音” as a metaphor for speech, city expression, and memory. It is not a promise of audio media, which remains outside the current public non-audio delivery scope.
- The confirmed source and rights boundary for music recommendations is recorded in the accompanying research note on illustrated-site music links. Platform availability may vary by region and copyright status, so every music link remains an optional outbound recommendation.
- Existing site material was created under an archive-first positioning. This specification intentionally changes the home experience and therefore requires a future, explicit update to the project glossary and ADR-0001 rather than silently relying on language that no longer describes the visitor-facing product.
