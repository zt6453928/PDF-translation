# PDF上传问题调试指南

## 问题现象
上传PDF后显示 "Not Found" 错误

## 调试步骤

### 1. 查看浏览器控制台
按 `F12` 打开开发者工具，查看：

**Console标签**：
```
上传结果: {success: true, file_id: "xxx", ...}
文件ID: xxx
总页数: 10
显示PDF预览，文件ID: xxx
PDF URL: /get_pdf/xxx#page=1
```

**Network标签**：
- 找到 `/get_pdf/xxx` 请求
- 查看状态码（应该是200，如果是404说明有问题）
- 查看请求URL是否正确

### 2. 查看PyCharm运行窗口

应该看到：
```
[PDF上传] 文件ID: xxx, 文件名: example.pdf
[PDF预览] 请求文件ID: xxx
[PDF预览] 当前存储的文件ID: ['xxx']
[PDF预览] 返回PDF文件，大小: 12345 字节
```

### 3. 检查文件ID

**正常情况**：
- 上传时生成的file_id: `abc123xyz`
- 预览时请求的file_id: `abc123xyz`
- 两者应该完全一致

**异常情况**：
- 上传时: `abc/123+xyz` (包含特殊字符)
- 预览时: `abc%2F123%2Bxyz` (URL编码后)
- 导致匹配失败

### 4. 常见问题

#### 问题1: 文件ID不匹配
**原因**: base64编码包含URL不安全字符

**解决**: 已使用 `urlsafe_b64encode`

#### 问题2: PDF存储丢失
**原因**: 服务器重启或内存清空

**解决**: 重新上传PDF

#### 问题3: 路由未注册
**原因**: Flask路由配置错误

**检查**: 
```python
@app.route('/get_pdf/<file_id>')
def get_pdf(file_id):
    ...
```

#### 问题4: CORS问题
**原因**: 跨域请求被阻止

**检查**: 浏览器控制台是否有CORS错误

---

## 快速测试

### 测试1: 直接访问PDF
1. 上传PDF
2. 复制浏览器控制台显示的 `PDF URL`
3. 在新标签页直接访问该URL
4. 应该能看到PDF或下载PDF

### 测试2: 检查存储
在PyCharm的Python Console中运行：
```python
from app import pdf_storage
print(pdf_storage.keys())
```

应该看到已上传的文件ID列表

### 测试3: 手动测试路由
```bash
# 假设file_id是 abc123
curl http://localhost:5001/get_pdf/abc123
```

应该返回PDF内容或错误信息

---

## 解决方案

### 方案1: 重启应用
```bash
# 停止应用 (Ctrl+C)
# 重新运行
python app.py
```

### 方案2: 清除浏览器缓存
1. 按 `Ctrl+Shift+Delete`
2. 清除缓存
3. 刷新页面

### 方案3: 检查代码更新
确保使用了最新的代码：
- `urlsafe_b64encode` 而不是 `b64encode`
- 添加了调试日志

### 方案4: 使用文本预览（临时）
如果PDF预览一直有问题，可以临时显示提取的文本：

修改 `displayPdfPreview` 函数：
```javascript
function displayPdfPreview(fileId) {
    // 临时显示文本而不是PDF
    originalContent.innerHTML = '<div class="placeholder"><p>PDF已上传，文本已提取</p></div>';
}
```

---

## 预期行为

### 正常流程
1. 用户上传PDF
2. 服务器生成唯一file_id
3. 存储PDF到内存
4. 返回file_id给前端
5. 前端请求 `/get_pdf/{file_id}`
6. 服务器返回PDF内容
7. iframe显示PDF

### 日志输出
```
127.0.0.1 - - [25/Oct/2025 02:35:01] "POST /upload HTTP/1.1" 200 -
[PDF上传] 文件ID: Xj9kL2mP4nQ8rT1v, 文件名: example.pdf
127.0.0.1 - - [25/Oct/2025 02:35:02] "GET /get_pdf/Xj9kL2mP4nQ8rT1v HTTP/1.1" 200 -
[PDF预览] 请求文件ID: Xj9kL2mP4nQ8rT1v
[PDF预览] 当前存储的文件ID: ['Xj9kL2mP4nQ8rT1v']
[PDF预览] 返回PDF文件，大小: 245678 字节
```

---

## 如果问题仍然存在

请提供以下信息：

1. **浏览器控制台完整输出**
2. **PyCharm运行窗口完整输出**
3. **Network标签中的请求详情**
4. **使用的浏览器和版本**
5. **PDF文件大小**

---

## 临时解决方案

如果PDF预览功能一直有问题，可以：

1. **只使用文本提取功能**
   - 左侧显示提取的文本
   - 不显示PDF预览

2. **下载PDF查看**
   - 添加下载原PDF的按钮
   - 用户下载后本地查看

3. **使用外部PDF查看器**
   - 提供PDF下载链接
   - 用户用系统PDF查看器打开

---

## 代码检查清单

- [ ] 使用 `urlsafe_b64encode`
- [ ] 添加了调试日志
- [ ] 路由正确注册
- [ ] PDF存储正常工作
- [ ] 前端正确传递file_id
- [ ] iframe src正确设置

祝你调试顺利！🔍

