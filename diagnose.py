#!/usr/bin/env python3
"""
快速诊断工具
检查环境和依赖是否正确安装
"""

import sys

def check_python_version():
    """检查Python版本"""
    print("1. 检查Python版本...")
    version = sys.version_info
    print(f"   Python版本: {version.major}.{version.minor}.{version.micro}")
    if version.major >= 3 and version.minor >= 7:
        print("   ✅ Python版本符合要求")
        return True
    else:
        print("   ❌ Python版本过低，需要3.7+")
        return False

def check_dependencies():
    """检查依赖包"""
    print("\n2. 检查依赖包...")
    
    packages = {
        'flask': 'Flask',
        'PyPDF2': 'PyPDF2',
        'requests': 'requests'
    }
    
    all_ok = True
    for module_name, package_name in packages.items():
        try:
            __import__(module_name)
            print(f"   ✅ {package_name} 已安装")
        except ImportError:
            print(f"   ❌ {package_name} 未安装")
            all_ok = False
    
    return all_ok

def check_requests_version():
    """检查requests包版本"""
    print("\n3. 检查requests包版本...")
    try:
        import requests
        version = requests.__version__
        print(f"   requests版本: {version}")
        print("   ✅ requests包正常")
        return True
    except Exception as e:
        print(f"   ❌ requests包有问题: {e}")
        return False

def test_network():
    """测试网络连接"""
    print("\n4. 测试网络连接...")
    
    import requests
    
    # 测试阿里云连接
    try:
        response = requests.get("https://dashscope.aliyuncs.com", timeout=5)
        print(f"   ✅ 可以连接到阿里云 (状态码: {response.status_code})")
    except Exception as e:
        print(f"   ❌ 无法连接到阿里云: {e}")
        return False
    
    return True

def check_files():
    """检查必要文件"""
    print("\n5. 检查项目文件...")
    
    import os
    
    files = [
        'app.py',
        'requirements.txt',
        'templates/index.html',
        'static/css/style.css',
        'static/js/script.js'
    ]
    
    all_ok = True
    for file in files:
        if os.path.exists(file):
            print(f"   ✅ {file}")
        else:
            print(f"   ❌ {file} 缺失")
            all_ok = False
    
    return all_ok

def main():
    """主函数"""
    print("=" * 60)
    print("PDF翻译器 - 环境诊断工具")
    print("=" * 60)
    
    results = []
    
    results.append(check_python_version())
    results.append(check_dependencies())
    results.append(check_requests_version())
    results.append(test_network())
    results.append(check_files())
    
    print("\n" + "=" * 60)
    if all(results):
        print("✅ 所有检查通过！环境配置正确。")
        print("\n下一步：")
        print("1. 运行应用: python app.py")
        print("2. 访问: http://localhost:5001")
        print("3. 配置API并开始使用")
    else:
        print("❌ 发现问题，请根据上述提示修复。")
        print("\n常见解决方案：")
        print("1. 安装依赖: pip install -r requirements.txt")
        print("2. 升级Python到3.7+")
        print("3. 检查网络连接")
    print("=" * 60)

if __name__ == "__main__":
    main()

