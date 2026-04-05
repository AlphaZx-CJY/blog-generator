---
title: LLM 应用架构设计：从原型到生产
date: 2026-01-20
summary: 探讨构建生产级 LLM 应用的关键架构决策，包括提示工程管理、上下文处理、流式响应、成本控制和评估体系。
tags: ["LLM", "架构设计", "AI应用", "生产实践"]
category: "架构设计"
published: true
origin: original
---

# LLM 应用架构设计：从原型到生产

把 LLM 原型变成生产级应用，中间隔着一道鸿沟。本文分享我在构建 LLM 应用时的一些架构思考。

## 核心挑战

### 1. 不确定性

传统应用：输入 → 确定逻辑 → 可预测输出  
LLM 应用：输入 → 概率模型 → 不确定输出

这带来一系列问题：
- 输出格式不稳定
- 质量波动
- 延迟不可控
- 成本难预估

### 2. 上下文限制

```
GPT-4: 128K tokens
Claude 3: 200K tokens
但长上下文 ≠ 有效利用
```

### 3. 成本控制

| 操作 | 相对成本 |
|------|----------|
| GPT-4 请求 | 100x |
| GPT-3.5 请求 | 10x |
| 本地缓存命中 | 1x |
| 本地计算 | 0.1x |

## 架构分层

```
┌─────────────────────────────────────┐
│           应用层 (App)               │
├─────────────────────────────────────┤
│         编排层 (Orchestration)       │
├─────────────────────────────────────┤
│         模型层 (Model)               │
├─────────────────────────────────────┤
│         基础设施层 (Infrastructure)   │
└─────────────────────────────────────┘
```

### 1. 应用层

- 用户交互界面
- 业务逻辑
- 会话管理

### 2. 编排层（核心）

```typescript
interface PromptTemplate {
  id: string;
  version: string;
  template: string;
  variables: Variable[];
  examples: Example[];
  outputSchema: JSONSchema;
}

class PromptEngine {
  async execute(
    templateId: string,
    variables: Record<string, any>,
    options: ExecutionOptions
  ): Promise<Result> {
    // 1. 加载模板
    const template = await this.loadTemplate(templateId);
    
    // 2. 渲染提示
    const prompt = this.render(template, variables);
    
    // 3. 检查缓存
    const cached = await this.cache.get(prompt);
    if (cached) return cached;
    
    // 4. 调用模型
    const result = await this.model.call(prompt, options);
    
    // 5. 后处理
    const processed = this.postProcess(result, template.outputSchema);
    
    // 6. 缓存结果
    await this.cache.set(prompt, processed);
    
    return processed;
  }
}
```

### 3. 模型层

- 多模型路由
- 降级策略
- 重试机制

```typescript
class ModelRouter {
  async route(request: Request): Promise<Response> {
    // 根据请求特征选择模型
    const model = this.selectModel(request);
    
    try {
      return await model.call(request);
    } catch (error) {
      // 降级到备选模型
      return await this.fallbackModel.call(request);
    }
  }
}
```

## 关键设计模式

### 1. 提示版本管理

```yaml
# prompts/summarize.yaml
version: "2.1.0"
description: "文章摘要生成"

template: |
  请为以下文章生成摘要，要求：
  - 字数在 {{ maxLength }} 字以内
  - 包含核心观点
  - 使用 {{ tone }} 语气
  
  文章：
  {{ content }}

variables:
  - name: content
    type: string
    required: true
  - name: maxLength
    type: number
    default: 200
  - name: tone
    type: enum
    values: ["正式", "轻松", "专业"]
    default: "正式"

examples:
  - input:
      content: "..."
      maxLength: 100
    output: "..."
```

### 2. 输出结构化

```typescript
// 使用 Zod 定义输出结构
const SummarySchema = z.object({
  title: z.string(),
  keyPoints: z.array(z.string()).max(5),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  tags: z.array(z.string())
});

// LLM 输出 + 结构化验证
const result = await llm.generate(
  prompt,
  { outputSchema: SummarySchema }
);
```

### 3. 流式处理

```typescript
class StreamingHandler {
  async *generateStream(prompt: string) {
    const stream = await model.stream(prompt);
    let buffer = '';
    
    for await (const chunk of stream) {
      buffer += chunk;
      
      // 尝试解析完整句子
      const sentences = this.extractSentences(buffer);
      if (sentences.length > 1) {
        yield sentences[0];
        buffer = sentences.slice(1).join('');
      }
    }
    
    if (buffer) yield buffer;
  }
}
```

### 4. 上下文管理

```typescript
class ContextManager {
  private maxTokens: number = 4000;
  
  buildContext(
    history: Message[],
    relevantDocs: Document[],
    currentQuery: string
  ): string {
    // 1. 优先保留最近的对话
    const recentMessages = this.takeRecent(history, 2000);
    
    // 2. 填充相关文档
    const remainingTokens = this.maxTokens - this.estimate(recentMessages);
    const selectedDocs = this.selectDocs(relevantDocs, remainingTokens);
    
    // 3. 组装上下文
    return this.format(selectedDocs, recentMessages, currentQuery);
  }
}
```

## 评估体系

### 自动评估

```typescript
interface Evaluator {
  // 输出格式正确性
  validateSchema(output: any): boolean;
  
  // 语义相似度
  calculateSimilarity(output: string, expected: string): number;
  
  // 幻觉检测
  detectHallucination(output: string, context: string): boolean;
}
```

### 人工评估

```
A/B 测试框架：
- 随机分配不同提示版本
- 收集用户反馈（👍/👎）
- 统计显著性分析
```

### 持续监控

```typescript
interface Metrics {
  // 质量指标
  responseQuality: number;      // 输出质量评分
  userSatisfaction: number;     // 用户满意度
  
  // 性能指标
  latencyP50: number;           // 中位延迟
  latencyP99: number;           // P99延迟
  
  // 成本指标
  tokenUsage: number;           // Token 消耗
  costPerRequest: number;       // 单次成本
}
```

## 生产 checklist

- [ ] 提示版本化管理和回滚机制
- [ ] 多模型路由和降级策略
- [ ] 输出格式验证和重试
- [ ] 请求缓存和去重
- [ ] 流式响应支持
- [ ] 成本监控和配额管理
- [ ] 内容安全过滤
- [ ] 完整的日志和追踪

## 结语

LLM 应用开发还在快速演进，但核心原则不变：

1. **把不确定性当作系统设计的第一要素**
2. **分层架构隔离变化**
3. **建立完整的评估和监控体系**
4. **保持对成本的敏感**

最重要的是，不要为了追求技术新潮而使用 LLM，而是用它来真正解决用户的痛点。
