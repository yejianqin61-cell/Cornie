# Cornie 4.2.4 往年今日模块详细设计

## 1. 文档信息

| 字段 | 内容 |
| --- | --- |
| 文档名称 | Cornie 4.2.4 往年今日模块详细设计 |
| 文件名称 | Cornie-4.2.4-往年今日模块-详细设计.md |
| 产品名称 | Cornie（铃湾） |
| 文档编号 | Cornie-4.2.4 |
| 文档类型 | 详细设计 |
| 文档版本 | V1.0 |
| 文档状态 | 编写中 |
| 编写日期 | 2026-05-17 |
| 适用对象 | 研发 |
| 上游文档 | ../Cornie-001-需求分析文档.md, Cornie-4.2-技术架构-详细设计.md |
| 下游文档 | - |
| 关联规范 | ../../criterion/Cornie-backend-api规范.md |
| 存放目录 | doc/design/ |

### 1.1 修订记录

| 版本 | 日期 | 修订人 | 修订说明 |
| ---- | ---- | ------ | -------- |
| V1.0 | 2026-05-17 | Claude | 初始版本，覆盖MVP往年今日模块 |

## 2. 模块概述

往年今日模块使用户在写日记时可以看到历史上同月同日的记录，形成"跨越时空的对话"。MVP阶段优先展示Cornie日记（更有情感价值），其次展示用户日记。

### 2.1 MVP功能范围

| 功能点 | 描述 | 优先级 | 实现状态 |
| --- | --- | --- | --- |
| 日期定位 | 首页选中某天时自动加载往年今日 | P0 | 已完成 |
| 双视角展示 | 同时展示往年同日的用户日记和Cornie日记 | P0 | 已完成 |
| 跳转查看 | 点击可跳转至完整日记页面 | P1 | 待实现 |
| 无记录提示 | 无往年记录时显示安慰文案 | P1 | 已完成（显示空状态） |

## 3. 数据查询

### 3.1 查询逻辑（已实现）

```sql
SELECT date, user_text AS userText, cornie_text AS cornieText
FROM diary_entries
WHERE substr(date, 6, 5) = substr($date, 6, 5)   -- 匹配 MM-DD
  AND date <> $date                                -- 排除今天
  AND (length(trim(coalesce(user_text, ''))) > 0 
       OR length(trim(coalesce(cornie_text, ''))) > 0)  -- 至少有一方有内容
ORDER BY date DESC
LIMIT $limit
```

### 3.2 索引优化

已建立按月日查询的索引：
```sql
CREATE INDEX IF NOT EXISTS idx_diary_entries_monthday 
ON diary_entries(substr(date, 6, 5));
```

### 3.3 查询参数

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| date | ISO date (YYYY-MM-DD) | 必填 | 以此为基准匹配月日 |
| limit | number | 20 | 最多返回条数，范围1-200 |

## 4. API设计

### 4.1 已有接口

```
GET /api/entries/:date/on-this-day?limit=N
```

响应：
```json
{
  "items": [
    {
      "date": "2025-05-17",
      "userText": "去年的今天写的日记...",
      "cornieText": "去年Cornie眼中的今天..."
    },
    {
      "date": "2024-05-17",
      "userText": "",
      "cornieText": "前年只有Cornie写了日记..."
    }
  ]
}
```

### 4.2 接口行为

- 按date降序排列（最近的年份在前）
- 至少用户日记或Cornie日记有一方不为空
- 最多返回limit条（默认20，上限200）

## 5. 前端展示（App.vue）

### 5.1 现有UI

在App.vue日记模式的右下方面板中，已有往年今日展示区：

```
.otdList
└── .otdItem (多个)
    ├── .otdDate       # "2025-05-17"
    └── .otdGrid
        ├── .otdCol     # 我的日记列
        │   ├── .otdLabel "我的"
        │   └── .otdText
        └── .otdCol     # Cornie日记列
            ├── .otdLabel "Cornie"
            └── .otdText
```

### 5.2 加载时机

- 每次切换选中日期时，自动触发`loadOnThisDay(selectedDate)`
- 加载失败不阻断主流程，仅在该面板显示错误提示

### 5.3 MVP改进点

| 改进 | 说明 | 优先级 |
| --- | --- | --- |
| 安慰文案 | 无记录时显示"那时候我还没出生呢，不过现在我在了。" | P1 |
| 点击跳转 | 点击往年条目跳转到对应日期（修改selectedDate） | P1 |
| 对话记录关联 | 往年今日中显示"当日有X条对话" | P2（V1） |
| 时光机动画 | Cornie播放特殊动画 | P2（V1） |

### 5.4 安慰文案实现

```js
// 当 onThisDayItems 为空且加载完成时
const emptyOnThisDay = computed(() => 
  onThisDayItems.value.length === 0 && !loadingOnThisDay.value
)

// 模板中
<div v-if="emptyOnThisDay" class="empty">
  那时候我还没出生呢，不过现在我在了。
</div>
```

## 6. 边界情况

| 场景 | 处理方式 |
| --- | --- |
| 当年第一年使用，无往年数据 | 显示安慰文案 |
| 某年只有用户日记无Cornie日记 | 只显示用户日记列，Cornie列显示"（空）" |
| 某年只有Cornie日记无用户日记 | 只显示Cornie日记列 |
| 网络异常 | 不影响，所有数据本地查询 |
| 数据库中有大量往年数据 | limit控制返回数量，默认20条 |

## 7. 待实现清单

| 优先级 | 任务 | 涉及文件 |
| --- | --- | --- |
| P1 | 安慰文案（Cornie语气） | src/renderer/App.vue |
| P1 | 点击往年条目跳转到对应日期 | src/renderer/App.vue |

---

**文档结束**
