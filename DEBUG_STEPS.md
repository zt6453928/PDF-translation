# 阿里云API 500错误调试步骤

## 立即执行以下步骤：

### 步骤1：运行诊断工具
```bash
python diagnose.py
```
这会检查：
- Python版本
- 依赖包安装情况
- OpenAI包版本
- 网络连接
- 项目文件完整性

### 步骤2：测试阿里云API
```bash
python test_aliyun_api.py YOUR_API_KEY
```

将 `YOUR_API_KEY` 替换为你的实际API Key。

**预期输出**：
```
正在测试阿里云API...
API Key: sk-xxxxxx...
模型: qwen-max
--------------------------------------------------
测试文本: Hello, how are you?
正在翻译...
翻译结果: 你好，你好吗？
--------------------------------------------------
✅ API测试成功！
```

### 步骤3：查看详细错误日志

在PyCharm运行窗口中，你应该看到类似这样的日志：

```
[阿里云翻译] 使用模型: qwen-max, API Key: sk-xxxxxx...
[阿里云翻译] 翻译方向: auto -> Chinese
[阿里云翻译] 文本长度: 123 字符
```

如果出错，会显示：
```
[错误] 阿里云翻译出错: xxxxx
Traceback (most recent call last):
  ...
```

**请复制完整的错误信息！**

### 步骤4：常见问题快速检查

#### ✅ API Key格式检查
正确格式：`sk-` 开头，后面跟一长串字符
```
sk-1234567890abcdefghijklmnopqrstuvwxyz
```

#### ✅ 模型名称检查
确保选择的是：
- qwen-max
- qwen-plus  
- qwen-turbo

**不是** qwen3-max 或其他变体！

#### ✅ 网络连接检查
```bash
curl https://dashscope.aliyuncs.com/compatible-mode/v1/models
```

#### ✅ 依赖包检查
```bash
pip list | grep openai
```
应该显示：`openai  1.12.0` 或更高版本

### 步骤5：重新安装依赖（如果需要）

```bash
pip uninstall openai -y
pip install openai==1.12.0
```

然后重启应用：
```bash
python app.py
```

### 步骤6：使用浏览器开发者工具

1. 在浏览器中按 `F12` 打开开发者工具
2. 切换到 "Network" (网络) 标签
3. 点击"开始翻译"
4. 查看 `/translate` 请求
5. 点击该请求，查看：
   - Request Payload (请求数据)
   - Response (响应数据)

### 步骤7：检查请求数据

在浏览器开发者工具中，Request Payload应该类似：
```json
{
  "text": "...",
  "source_lang": "auto",
  "target_lang": "ZH",
  "api_type": "aliyun",
  "api_key": "sk-xxxxx",
  "model": "qwen-max"
}
```

确认：
- `api_type` 是 `"aliyun"`
- `api_key` 存在且正确
- `model` 是有效的模型名称

---

## 可能的错误及解决方案

### 错误1：`Invalid API key`
**原因**：API Key无效
**解决**：
1. 登录阿里云DashScope控制台
2. 检查API Key状态
3. 如果失效，创建新的API Key
4. 重新配置

### 错误2：`Model not found: qwen-max`
**原因**：模型名称可能需要更新
**解决**：
尝试其他模型名称：
- `qwen-max-latest`
- `qwen-max-0428`
- `qwen2.5-72b-instruct`

或访问阿里云文档查看最新模型列表：
https://help.aliyun.com/zh/dashscope/developer-reference/model-square

### 错误3：`Connection timeout`
**原因**：网络问题
**解决**：
1. 检查防火墙设置
2. 尝试使用代理
3. 检查DNS设置

### 错误4：`Insufficient balance`
**原因**：账户余额不足
**解决**：
1. 登录阿里云控制台
2. 充值账户
3. 检查是否有免费额度

### 错误5：`openai module has no attribute 'OpenAI'`
**原因**：openai包版本太低
**解决**：
```bash
pip install --upgrade openai
```

---

## 如果以上都无法解决

请提供以下信息：

1. **诊断工具输出**：
   ```bash
   python diagnose.py > diagnosis.txt
   ```

2. **测试脚本输出**：
   ```bash
   python test_aliyun_api.py YOUR_KEY > test_result.txt 2>&1
   ```

3. **完整错误日志**：
   从PyCharm运行窗口复制完整的错误堆栈

4. **浏览器Network信息**：
   - Request Payload
   - Response

5. **环境信息**：
   - 操作系统
   - Python版本
   - 是否使用虚拟环境
   - 是否使用代理/VPN

---

## 临时解决方案

如果阿里云API暂时无法使用，可以：

1. **切换到DeepLX**：
   - 在配置面板选择"DeepLX"
   - 配置DeepLX API地址
   - 继续使用

2. **等待修复**：
   - 阿里云服务可能临时维护
   - 稍后重试

3. **联系阿里云支持**：
   - 提交工单
   - 描述问题
   - 提供错误信息

---

## 成功标志

当一切正常时，你会看到：

**PyCharm日志**：
```
[阿里云翻译] 使用模型: qwen-max, API Key: sk-xxxxxx...
[阿里云翻译] 翻译方向: auto -> Chinese
[阿里云翻译] 文本长度: 123 字符
[阿里云翻译] 翻译成功，结果长度: 45 字符
127.0.0.1 - - [25/Oct/2025 01:50:01] "POST /translate HTTP/1.1" 200 -
```

**浏览器**：
- 进度条正常显示
- 译文区域显示翻译结果
- 没有错误提示

祝你调试顺利！🎉

