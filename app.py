from flask import Flask, render_template, request, jsonify, send_file
import requests
import PyPDF2
import io
import os
import base64
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import inch
import textwrap

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 限制上传文件大小为16MB

# 存储上传的PDF文件（使用session或临时存储）
pdf_storage = {}

# 语言代码映射（用于阿里云翻译）
LANGUAGE_NAMES = {
    'auto': 'auto',
    'EN': 'English',
    'ZH': 'Chinese',
    'JA': 'Japanese',
    'KO': 'Korean',
    'FR': 'French',
    'DE': 'German',
    'ES': 'Spanish',
    'RU': 'Russian'
}


@app.route('/')
def index():
    """主页面"""
    return render_template('index.html')


@app.route('/config')
def get_config():
    """前端配置：提供默认翻译服务和是否存在服务器侧的密钥等信息（不返回密钥本身）"""
    aliyun_has_key = bool(os.environ.get('ALIYUN_API_KEY'))
    aliyun_default_model = os.environ.get('ALIYUN_DEFAULT_MODEL', 'qwen-flash')
    return jsonify({
        'default_api': 'aliyun',
        'aliyun': {
            'has_server_key': aliyun_has_key,
            'default_model': aliyun_default_model
        }
    })


@app.route('/upload', methods=['POST'])
def upload_pdf():
    """处理PDF上传并提取文本"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': '只支持PDF文件'}), 400

        # 读取PDF文件
        pdf_content = file.read()
        pdf_file = io.BytesIO(pdf_content)

        # 生成唯一ID（使用URL安全的base64编码）
        file_id = base64.urlsafe_b64encode(os.urandom(16)).decode('utf-8').rstrip('=')

        # 存储PDF文件内容
        pdf_storage[file_id] = pdf_content

        print(f"[PDF上传] 文件ID: {file_id}, 文件名: {file.filename}")

        # 提取文本
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        text_content = []

        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            if text.strip():
                text_content.append({
                    'page': page_num + 1,
                    'text': text.strip()
                })

        if not text_content:
            return jsonify({'error': 'PDF中没有提取到文本内容'}), 400

        return jsonify({
            'success': True,
            'file_id': file_id,
            'content': text_content,
            'total_pages': len(pdf_reader.pages),
            'filename': file.filename
        })

    except Exception as e:
        return jsonify({'error': f'处理PDF时出错: {str(e)}'}), 500


@app.route('/get_pdf/<file_id>')
def get_pdf(file_id):
    """获取PDF文件用于预览"""
    print(f"[PDF预览] 请求文件ID: {file_id}")
    print(f"[PDF预览] 当前存储的文件ID: {list(pdf_storage.keys())}")

    if file_id not in pdf_storage:
        print(f"[错误] 文件ID {file_id} 不存在")
        return "PDF文件不存在或已过期", 404

    print(f"[PDF预览] 返回PDF文件，大小: {len(pdf_storage[file_id])} 字节")

    return send_file(
        io.BytesIO(pdf_storage[file_id]),
        mimetype='application/pdf',
        as_attachment=False
    )


@app.route('/translate', methods=['POST'])
def translate_text():
    """调用翻译API（支持DeepLX和阿里云）"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        source_lang = data.get('source_lang', 'auto')
        target_lang = data.get('target_lang', 'ZH')
        api_type = data.get('api_type', 'deeplx')

        if not text:
            return jsonify({'error': '没有要翻译的文本'}), 400

        if api_type == 'deeplx':
            return translate_with_deeplx(text, source_lang, target_lang, data)
        elif api_type == 'aliyun':
            return translate_with_aliyun(text, source_lang, target_lang, data)
        else:
            return jsonify({'error': '不支持的API类型'}), 400

    except Exception as e:
        return jsonify({'error': f'翻译时出错: {str(e)}'}), 500


def translate_long_text_aliyun(text, source_lang, target_lang, api_key, model, chunk_size):
    """分块翻译长文本"""
    try:
        # 按段落分割文本
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = []
        current_length = 0

        for para in paragraphs:
            para_length = len(para)
            if current_length + para_length > chunk_size and current_chunk:
                # 当前块已满，保存并开始新块
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = [para]
                current_length = para_length
            else:
                current_chunk.append(para)
                current_length += para_length

        # 添加最后一块
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))

        print(f"[阿里云翻译] 分成 {len(chunks)} 块进行翻译")

        # 翻译每一块
        translated_chunks = []
        source_lang_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_lang_name = LANGUAGE_NAMES.get(target_lang, target_lang)

        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        for i, chunk in enumerate(chunks):
            print(f"[阿里云翻译] 翻译第 {i+1}/{len(chunks)} 块...")

            if source_lang == 'auto':
                prompt = f"Please translate the following text to {target_lang_name}. Only return the translated text without any explanation:\n\n{chunk}"
            else:
                prompt = f"Please translate the following text from {source_lang_name} to {target_lang_name}. Only return the translated text without any explanation:\n\n{chunk}"

            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a professional translator. Translate the text accurately and naturally."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            }

            # 重试机制
            max_retries = 2
            success = False
            for attempt in range(max_retries):
                try:
                    response = requests.post(url, headers=headers, json=payload, timeout=120)
                    if response.status_code == 200:
                        result = response.json()
                        translated_text = result['choices'][0]['message']['content'].strip()
                        translated_chunks.append(translated_text)
                        success = True
                        break
                except requests.exceptions.Timeout:
                    print(f"[警告] 第 {i+1} 块第 {attempt + 1} 次尝试超时")
                    if attempt == max_retries - 1:
                        return jsonify({'error': f'第 {i+1} 块翻译超时'}), 500

            if not success:
                return jsonify({'error': f'第 {i+1} 块翻译失败'}), 500

        # 合并所有翻译结果
        final_translation = '\n\n'.join(translated_chunks)
        print(f"[阿里云翻译] 所有块翻译完成，总长度: {len(final_translation)} 字符")

        return jsonify({
            'success': True,
            'translated_text': final_translation
        })

    except Exception as e:
        print(f"[错误] 分块翻译失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'分块翻译失败: {str(e)}'}), 500


def translate_with_deeplx(text, source_lang, target_lang, data):
    """使用DeepLX API翻译"""
    try:
        api_url = data.get('api_url', '')

        if not api_url:
            return jsonify({'error': '请先配置DeepLX API地址'}), 400

        payload = {
            'text': text,
            'source_lang': source_lang,
            'target_lang': target_lang
        }

        response = requests.post(api_url, json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            return jsonify({
                'success': True,
                'translated_text': result.get('data', '')
            })
        else:
            return jsonify({
                'error': f'DeepLX API返回错误: {response.status_code}'
            }), 500

    except requests.exceptions.Timeout:
        return jsonify({'error': 'DeepLX请求超时'}), 500
    except Exception as e:
        return jsonify({'error': f'DeepLX翻译出错: {str(e)}'}), 500


def translate_with_aliyun(text, source_lang, target_lang, data):
    """使用阿里云通义千问API翻译（使用requests直接调用）"""
    try:
        # 客户端可传入api_key与model；若未提供，则使用服务端环境变量（更安全）
        api_key = data.get('api_key') or os.environ.get('ALIYUN_API_KEY', '')
        model = data.get('model') or os.environ.get('ALIYUN_DEFAULT_MODEL', 'qwen-flash')

        if not api_key:
            return jsonify({'error': '请先配置阿里云API Key'}), 400

        print(f"[阿里云翻译] 使用模型: {model}, API Key: {api_key[:10]}...")

        # 构建翻译提示词
        source_lang_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_lang_name = LANGUAGE_NAMES.get(target_lang, target_lang)

        print(f"[阿里云翻译] 翻译方向: {source_lang_name} -> {target_lang_name}")
        print(f"[阿里云翻译] 文本长度: {len(text)} 字符")

        # 如果文本太长，分块翻译
        max_chunk_size = 2000  # 每块最大字符数
        if len(text) > max_chunk_size:
            print(f"[阿里云翻译] 文本过长，分块翻译...")
            return translate_long_text_aliyun(text, source_lang, target_lang, api_key, model, max_chunk_size)

        # 翻译单个文本块
        if source_lang == 'auto':
            prompt = f"Please translate the following text to {target_lang_name}. Only return the translated text without any explanation:\n\n{text}"
        else:
            prompt = f"Please translate the following text from {source_lang_name} to {target_lang_name}. Only return the translated text without any explanation:\n\n{text}"

        # 使用requests直接调用阿里云API，增加超时时间和重试
        url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a professional translator. Translate the text accurately and naturally."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3
        }

        # 重试机制
        max_retries = 2
        for attempt in range(max_retries):
            try:
                print(f"[阿里云翻译] 尝试 {attempt + 1}/{max_retries}...")
                response = requests.post(url, headers=headers, json=payload, timeout=120)

                if response.status_code == 200:
                    result = response.json()
                    translated_text = result['choices'][0]['message']['content'].strip()
                    print(f"[阿里云翻译] 翻译成功，结果长度: {len(translated_text)} 字符")

                    return jsonify({
                        'success': True,
                        'translated_text': translated_text
                    })
                else:
                    error_msg = f"阿里云API返回错误: {response.status_code} - {response.text}"
                    print(f"[错误] {error_msg}")
                    if attempt == max_retries - 1:
                        return jsonify({'error': error_msg}), 500
            except requests.exceptions.Timeout:
                print(f"[警告] 第 {attempt + 1} 次尝试超时")
                if attempt == max_retries - 1:
                    return jsonify({'error': '翻译请求超时，请尝试使用更快的模型（如qwen-turbo）或减少PDF页数'}), 500
            except Exception as e:
                print(f"[错误] 第 {attempt + 1} 次尝试失败: {str(e)}")
                if attempt == max_retries - 1:
                    raise

    except Exception as e:
        error_str = str(e)
        print(f"[错误] 阿里云翻译出错: {error_str}")
        import traceback
        traceback.print_exc()

        # 提供更友好的错误提示
        if 'Invalid API key' in error_str or 'Incorrect API key' in error_str:
            error_msg = '阿里云API Key无效，请检查是否正确复制（应以sk-开头）'
        elif 'Model not found' in error_str:
            error_msg = f'模型 {model} 不存在，请选择 qwen-max、qwen-plus 或 qwen-turbo'
        elif 'Insufficient balance' in error_str or 'balance' in error_str.lower():
            error_msg = '账户余额不足，请前往阿里云控制台充值'
        elif 'Rate limit' in error_str:
            error_msg = '请求频率过高，请稍后再试'
        elif 'timeout' in error_str.lower():
            error_msg = '请求超时，请检查网络连接'
        else:
            error_msg = f'阿里云翻译出错: {error_str}'

        return jsonify({'error': error_msg}), 500


@app.route('/download_pdf', methods=['POST'])
def download_pdf():
    """生成并下载译文PDF"""
    try:
        data = request.get_json()
        translated_pages = data.get('pages', [])
        filename = data.get('filename', 'translated.pdf')

        if not translated_pages:
            return jsonify({'error': '没有翻译内容'}), 400

        # 创建PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # 注册中文字体（使用系统字体）
        try:
            # macOS 系统字体
            pdfmetrics.registerFont(TTFont('SimSun', '/System/Library/Fonts/STHeiti Light.ttc'))
            font_name = 'SimSun'
        except:
            try:
                # 尝试其他常见字体
                pdfmetrics.registerFont(TTFont('SimSun', '/System/Library/Fonts/PingFang.ttc'))
                font_name = 'SimSun'
            except:
                # 如果都失败，使用默认字体（可能不支持中文）
                font_name = 'Helvetica'
                print("[警告] 无法加载中文字体，使用默认字体")

        # 设置字体和大小
        c.setFont(font_name, 12)

        # 页面边距
        margin = 0.75 * inch
        text_width = width - 2 * margin

        for page_data in translated_pages:
            page_num = page_data.get('page', 1)
            text = page_data.get('text', '')

            # 添加页码标题
            c.setFont(font_name, 14)
            c.drawString(margin, height - margin, f"第 {page_num} 页")

            # 重置字体
            c.setFont(font_name, 12)

            # 分行处理文本
            y_position = height - margin - 30
            line_height = 18

            # 按段落分割
            paragraphs = text.split('\n')

            for paragraph in paragraphs:
                if not paragraph.strip():
                    y_position -= line_height / 2
                    continue

                # 自动换行
                max_chars = int(text_width / 7)  # 估算每行字符数
                lines = textwrap.wrap(paragraph, width=max_chars)

                for line in lines:
                    if y_position < margin + 20:
                        # 页面空间不足，创建新页
                        c.showPage()
                        c.setFont(font_name, 12)
                        y_position = height - margin

                    c.drawString(margin, y_position, line)
                    y_position -= line_height

                # 段落间距
                y_position -= line_height / 2

            # 每个原PDF页面后创建新页
            c.showPage()

        # 保存PDF
        c.save()
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        print(f"[错误] 生成PDF失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'生成PDF失败: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5001'))
    debug_env = os.environ.get('FLASK_DEBUG', '0')
    debug = debug_env == '1' or debug_env.lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
