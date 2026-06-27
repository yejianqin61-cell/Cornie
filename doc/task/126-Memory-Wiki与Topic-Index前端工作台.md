# 126 Memory Wiki 与 Topic Index 前端工作台

## 1. 任务目标

为 Memory Wiki 与 Topic Index 落地正式前端工作台，补齐列表、详情、编辑、版本和主题管理入口。

## 2. 任务来源

- `doc/Cornie-013-当前项目完成度复评与后续行动建议.md` 第 `8.2` 节

## 3. 前置依赖

- `123-125` 已完成

## 4. 涉及范围

- `src/renderer/`
- `src/renderer/components/`
- `src/renderer/api.js`

## 5. 当前问题

虽然 `memory-wiki` 后端接口已存在，但前端目前没有正式的 Memory Wiki 页面、版本历史页和 Topic Index 管理页。

## 6. 目标设计

- 落地 Memory Wiki 列表页
- 落地 Memory Wiki 详情与编辑页
- 落地版本历史与回滚操作面
- 落地 Topic Index 列表与详情页

## 7. 实现步骤

### Step 1

补 `memory-wiki` 与 `topic-index` 前端 API 封装缺口。

### Step 2

落地 Memory Wiki 列表与详情页。

### Step 3

落地版本历史与回滚视图。

### Step 4

落地 Topic Index 管理页。

## 8. 测试点

- Wiki 页面可浏览、查看、编辑
- 版本历史可查看
- Topic Index 可浏览、查看详情

## 9. 完成标准

- Memory Wiki 与 Topic Index 具备正式人类操作面

## 10. 交付物

- Memory Wiki 工作台
- Topic Index 工作台

---

**文档结束**
