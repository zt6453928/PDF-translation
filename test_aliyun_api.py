#!/usr/bin/env python3
"""
测试阿里云API连接
使用方法：python test_aliyun_api.py YOUR_API_KEY
"""

import sys
import requests

def test_aliyun_api(api_key, model="qwen-plus"):
    """测试阿里云API"""
    try:
        print(f"正在测试阿里云API...")
        print(f"API Key: {api_key[:10]}...")
        print(f"模型: {model}")
        print("-" * 50)

        # 测试翻译
        test_text = "Hello, how are you?"
        print(f"测试文本: {test_text}")
        print("正在翻译...")

        # 调用阿里云API
        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a professional translator."},
                {"role": "user", "content": f"Please translate the following text to Chinese: {test_text}"}
            ],
            "temperature": 0.3
        }

        response = requests.post(url, headers=headers, json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            translated_text = result['choices'][0]['message']['content'].strip()
            print(f"翻译结果: {translated_text}")
            print("-" * 50)
            print("✅ API测试成功！")
            return True
        else:
            print(f"❌ API返回错误: {response.status_code}")
            print(f"错误信息: {response.text}")
            return False

    except Exception as e:
        print(f"❌ API测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("使用方法: python test_aliyun_api.py YOUR_API_KEY [model]")
        print("示例: python test_aliyun_api.py sk-xxxxx qwen-plus")
        print("\n可用模型:")
        print("  - qwen-max (最新版本)")
        print("  - qwen-plus (推荐)")
        print("  - qwen-turbo (快速)")
        print("  - qwen2.5-72b-instruct")
        print("  - qwen2.5-32b-instruct")
        sys.exit(1)

    api_key = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else "qwen-plus"

    test_aliyun_api(api_key, model)

