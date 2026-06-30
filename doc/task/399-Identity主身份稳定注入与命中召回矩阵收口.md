# 399-Identity主身份稳定注入与命中召回矩阵收口

## 1. 任务目标

根据 `doc/design/Cornie-0630-Identity记忆实体模型与页面结构设计.md`，把主身份页、人物页、偏好页、trait 页在主链 prompt 中的默认注入 / 条件召回矩阵进一步显式化、代码化、可验证化。

## 2. 任务来源

- `Cornie-0630-Identity记忆实体模型与页面结构设计.md` 第 4、5、6、7、11、12 节

## 3. 目标设计

- 明确 `identity_profile` 为默认稳定注入
- 明确 `identity_person / preference / trait` 为条件召回
- 固化命中查询的优先级规则
- 增补脚本验证不同 query 对应的装载结果

## 4. 完成标准

- Identity 不再停留在“能存”，而是进入“稳定读回、稳定命中、稳定注入”

## 5. 提交建议

`feat(identity): finalize stable injection and conditional recall matrix`
