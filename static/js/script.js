// 全局变量
let pdfContent = null;
let translatedContent = [];
let currentFileId = null;
let apiConfig = {
    type: 'deeplx',
    deeplxUrl: '',
    aliyunKey: '',
    aliyunModel: 'qwen-plus'
};
let totalPages = 0;
let currentPage = 1;

// PDF.js 渲染状态
let pdfDoc = null;           // pdfjs 文档对象
let pdfUseSVG = true;        // 是否使用SVG渲染（可仅放大图片）
let imageZoom = 1.0;         // 图片缩放倍率（1.0 = 100%）
let pageZoom = 1.0;          // 页面整体缩放倍率（1.0 = 100%）
let pdfReady = false;        // PDF.js是否就绪

// DOM元素
const pdfFileInput = document.getElementById('pdfFile');
const uploadBtn = document.getElementById('uploadBtn');
const translateBtn = document.getElementById('translateBtn');
const originalContent = document.getElementById('originalContent');
const translatedContentDiv = document.getElementById('translatedContent');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const sourceLang = document.getElementById('sourceLang');
const targetLang = document.getElementById('targetLang');
const menuCopyBtn = document.getElementById('menuCopyBtn');
const menuDownloadTxtBtn = document.getElementById('menuDownloadTxtBtn');
const menuDownloadPdfBtn = document.getElementById('menuDownloadPdfBtn');
const originalPageInfo = document.getElementById('originalPageInfo');
const translatedPageInfo = document.getElementById('translatedPageInfo');
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const sideMenu = document.getElementById('sideMenu');
const apiTypeSelect = document.getElementById('apiType');
const exportSection = document.getElementById('exportSection');
const deeplxConfig = document.getElementById('deeplxConfig');
const aliyunConfig = document.getElementById('aliyunConfig');
const deeplxUrlInput = document.getElementById('deeplxUrl');
const aliyunKeyInput = document.getElementById('aliyunKey');
const aliyunModelInput = document.getElementById('aliyunModel');
const saveApiBtn = document.getElementById('saveApiBtn');

// 页码导航元素
const pdfNavigation = document.getElementById('pdfNavigation');
const translationNavigation = document.getElementById('translationNavigation');
const pdfPageInput = document.getElementById('pdfPageInput');
const transPageInput = document.getElementById('transPageInput');
const pdfTotalPages = document.getElementById('pdfTotalPages');
const transTotalPages = document.getElementById('transTotalPages');
const pdfPrevBtn = document.getElementById('pdfPrevBtn');
const pdfNextBtn = document.getElementById('pdfNextBtn');
const transPrevBtn = document.getElementById('transPrevBtn');
const transNextBtn = document.getElementById('transNextBtn');
// 移动端标签切换
const mobileTabs = document.getElementById('mobileTabs');
const tabOriginal = document.getElementById('tabOriginal');
const tabTranslated = document.getElementById('tabTranslated');
const panelOriginal = document.getElementById('panelOriginal');
const panelTranslated = document.getElementById('panelTranslated');
const zoomControls = document.getElementById('zoomControls');
const pageZoomGroup = document.getElementById('pageZoomGroup');
const imageZoomGroup = document.getElementById('imageZoomGroup');
const pageZoomRange = document.getElementById('pageZoomRange');
const pageZoomLabel = document.getElementById('pageZoomLabel');
const imageZoomRange = document.getElementById('imageZoomRange');
const imageZoomLabel = document.getElementById('imageZoomLabel');

// 从localStorage加载API配置
window.addEventListener('load', () => {
    const savedConfig = localStorage.getItem('translation_api_config');
    if (savedConfig) {
        try {
            apiConfig = JSON.parse(savedConfig);
            apiTypeSelect.value = apiConfig.type;
            deeplxUrlInput.value = apiConfig.deeplxUrl || '';
            aliyunKeyInput.value = apiConfig.aliyunKey || '';
            aliyunModelInput.value = apiConfig.aliyunModel || 'qwen-plus';

            // 显示对应的配置区域
            updateApiConfigDisplay();

            if (apiConfig.deeplxUrl) deeplxUrlInput.classList.add('saved');
            if (apiConfig.aliyunKey) aliyunKeyInput.classList.add('saved');
        } catch (e) {
            console.error('加载配置失败', e);
        }
    }

    // 初始化移动端标签
    setupMobileTabs();
});

// 打开/关闭侧边菜单
menuBtn.addEventListener('click', () => {
    sideMenu.classList.add('open');
});

closeMenuBtn.addEventListener('click', () => {
    sideMenu.classList.remove('open');
});

// 点击菜单外部关闭
document.addEventListener('click', (e) => {
    if (sideMenu.classList.contains('open') &&
        !sideMenu.contains(e.target) &&
        !menuBtn.contains(e.target)) {
        sideMenu.classList.remove('open');
    }
});

// API类型切换
apiTypeSelect.addEventListener('change', () => {
    updateApiConfigDisplay();
});

// 更新API配置显示
function updateApiConfigDisplay() {
    if (apiTypeSelect.value === 'deeplx') {
        deeplxConfig.style.display = 'flex';
        aliyunConfig.style.display = 'none';
    } else {
        deeplxConfig.style.display = 'none';
        aliyunConfig.style.display = 'flex';
    }
}

// 保存API配置
saveApiBtn.addEventListener('click', () => {
    apiConfig.type = apiTypeSelect.value;

    if (apiConfig.type === 'deeplx') {
        const url = deeplxUrlInput.value.trim();
        if (!url) {
            showToast('请输入DeepLX API地址', 'error');
            return;
        }
        apiConfig.deeplxUrl = url;
        deeplxUrlInput.classList.add('saved');
    } else {
        const key = aliyunKeyInput.value.trim();
        const model = aliyunModelInput.value.trim();

        if (!key) {
            showToast('请输入阿里云API Key', 'error');
            return;
        }

        if (!model) {
            showToast('请输入模型名称', 'error');
            return;
        }

        apiConfig.aliyunKey = key;
        apiConfig.aliyunModel = model;
        aliyunKeyInput.classList.add('saved');
        aliyunModelInput.classList.add('saved');
    }

    localStorage.setItem('translation_api_config', JSON.stringify(apiConfig));
    showToast('API配置已保存', 'success');
});

// 上传按钮点击（如果是label，浏览器会自动触发文件选择，不再二次触发click）
if (uploadBtn && uploadBtn.tagName !== 'LABEL') {
    uploadBtn.addEventListener('click', () => {
        if (pdfFileInput) pdfFileInput.click();
    });
}

// 文件上传处理
pdfFileInput.addEventListener('change', handleFileSelect);

// 页码导航事件监听
pdfPrevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        goToPdfPage(currentPage - 1);
    }
});

pdfNextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        goToPdfPage(currentPage + 1);
    }
});

transPrevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        goToPdfPage(currentPage - 1);
    }
});

transNextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        goToPdfPage(currentPage + 1);
    }
});

pdfPageInput.addEventListener('change', (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
        goToPdfPage(page);
    } else {
        e.target.value = currentPage;
    }
});

transPageInput.addEventListener('change', (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
        goToPdfPage(page);
    } else {
        e.target.value = currentPage;
    }
});

// 键盘快捷键
pdfPageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.target.blur();
    }
});

transPageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.target.blur();
    }
});

// 全局键盘快捷键
document.addEventListener('keydown', (e) => {
    // 如果正在输入，不响应快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentPage > 1) {
            goToPdfPage(currentPage - 1);
        }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentPage < totalPages) {
            goToPdfPage(currentPage + 1);
        }
    } else if (e.key === 'Home') {
        e.preventDefault();
        goToPdfPage(1);
    } else if (e.key === 'End') {
        e.preventDefault();
        goToPdfPage(totalPages);
    }
});

// 初始化与事件：移动端标签切换（极小屏幕）
function setupMobileTabs() {
    // 根据屏幕宽度决定是否启用标签模式（<=414px）
    const enableTabs = () => window.matchMedia('(max-width: 414px)').matches;
    const showPane = (pane) => {
        const isOriginal = pane === 'original';
        if (enableTabs()) {
            if (panelOriginal) panelOriginal.style.display = isOriginal ? 'flex' : 'none';
            if (panelTranslated) panelTranslated.style.display = isOriginal ? 'none' : 'flex';
        } else {
            // 还原为并排/上下布局
            if (panelOriginal) panelOriginal.style.display = 'flex';
            if (panelTranslated) panelTranslated.style.display = 'flex';
        }
        if (tabOriginal && tabTranslated) {
            tabOriginal.classList.toggle('active', isOriginal);
            tabTranslated.classList.toggle('active', !isOriginal);
            tabOriginal.setAttribute('aria-selected', String(isOriginal));
            tabTranslated.setAttribute('aria-selected', String(!isOriginal));
        }
        // 当切换到译文时，确保译文导航显示正确
        if (!isOriginal && translatedContent.length > 0) {
            translationNavigation.style.display = 'flex';
        }
    };

    // 默认展示原文
    showPane('original');

    // 绑定事件
    if (tabOriginal) tabOriginal.addEventListener('click', () => showPane('original'));
    if (tabTranslated) tabTranslated.addEventListener('click', () => showPane('translated'));

    // 监听窗口尺寸变化
    window.addEventListener('resize', () => {
        showPane(tabOriginal && tabOriginal.classList.contains('active') ? 'original' : 'translated');
    });

    // 初始根据当前窗口宽度设置标签可见性
    if (mobileTabs) {
        mobileTabs.style.display = window.matchMedia('(max-width: 414px)').matches ? 'flex' : 'none';
        window.addEventListener('resize', () => {
            mobileTabs.style.display = window.matchMedia('(max-width: 414px)').matches ? 'flex' : 'none';
        });
    }

    // 轻扫手势切换标签（仅在标签模式启用时）
    let touchStartX = 0, touchStartY = 0;
    const threshold = 50; // 触发切换的最小水平距离
    const attachSwipe = (el) => {
        if (!el) return;
        el.addEventListener('touchstart', (e) => {
            if (!enableTabs()) return;
            const t = e.touches && e.touches[0];
            if (!t) return;
            touchStartX = t.clientX;
            touchStartY = t.clientY;
        }, { passive: true });
        el.addEventListener('touchend', (e) => {
            if (!enableTabs()) return;
            const t = e.changedTouches && e.changedTouches[0];
            if (!t) return;
            const dx = t.clientX - touchStartX;
            const dy = t.clientY - touchStartY;
            if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) + 10) {
                // 左滑：原文 -> 译文；右滑：译文 -> 原文
                const originalActive = tabOriginal && tabOriginal.classList.contains('active');
                if (dx < 0 && originalActive) {
                    // 左滑，切到译文
                    tabTranslated && tabTranslated.click();
                } else if (dx > 0 && !originalActive) {
                    // 右滑，切到原文
                    tabOriginal && tabOriginal.click();
                }
            }
        }, { passive: true });
    };
    attachSwipe(panelOriginal);
    attachSwipe(panelTranslated);
}



// 处理文件选择
async function handleFileSelect() {
    const file = pdfFileInput.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('请选择PDF文件', 'error');
        return;
    }

    showToast('正在读取PDF文件...', 'success');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        console.log('上传结果:', result);

        if (result.success) {
            pdfContent = result.content;
            currentFileId = result.file_id;
            totalPages = result.total_pages;
            currentPage = 1;

            console.log('文件ID:', currentFileId);
            console.log('总页数:', totalPages);

            // 在极小屏幕（开启标签模式）下，确保原文面板可见
            try { ensureOriginalVisibleOnSmallScreens(); } catch (_) {}
            displayPdfPreview(result.file_id);
            initPageNavigation(totalPages);

            translateBtn.disabled = false;
            showToast(`成功读取PDF，共${result.total_pages}页`, 'success');

            // 设置文件信息，添加tooltip
            const fileInfo = `${result.filename} (${result.total_pages}页)`;
            originalPageInfo.textContent = fileInfo;
            originalPageInfo.title = fileInfo; // 鼠标悬停显示完整信息

            // 自动关闭菜单
            sideMenu.classList.remove('open');
        } else {
            showToast(result.error || '读取PDF失败', 'error');
        }
    } catch (error) {
        showToast('上传文件时出错: ' + error.message, 'error');
    }
}

// 显示PDF预览
function displayPdfPreview(fileId) {
    console.log('显示PDF预览（PDF.js），文件ID:', fileId);
    // 显示加载占位
    originalContent.innerHTML = '<div class="pdf-svg-container"><div class="placeholder">正在加载预览…</div></div>';

    const ensurePdfJs = () => typeof window.pdfjsLib !== 'undefined';
    const waitForPdfJs = (timeoutMs = 4000) => new Promise((resolve, reject) => {
        const start = Date.now();
        (function check() {
            if (ensurePdfJs()) return resolve();
            if (Date.now() - start > timeoutMs) return reject(new Error('PDF.js加载超时'));
            setTimeout(check, 100);
        })();
    });

    waitForPdfJs().then(async () => {
        pdfReady = true;
        // 配置worker（使用CDN稳定版本；如需离线请将worker放入static/vendor/pdfjs）
        try {
            if (window.pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            }
        } catch (e) { console.warn('配置PDF.js worker失败:', e); }

        // 检测SVG支持
        pdfUseSVG = !!(window.pdfjsLib && pdfjsLib.SVGGraphics);
        if (!pdfUseSVG) {
            console.warn('未检测到SVGGraphics，回退为canvas渲染（无法仅放大图片）。');
        }

        // 准备容器
        originalContent.innerHTML = '<div id="pdfSvgContainer" class="pdf-svg-container"></div>';

        // 加载PDF
        const url = `/get_pdf/${fileId}`;
        try {
            const loadingTask = pdfjsLib.getDocument({ url });
            pdfDoc = await loadingTask.promise;

            // 显示缩放控件：页面缩放始终可用；图片缩放仅SVG可用
            if (zoomControls) zoomControls.style.display = 'flex';
            if (pageZoomGroup) pageZoomGroup.style.display = 'flex';
            if (imageZoomGroup) imageZoomGroup.style.display = pdfUseSVG ? 'flex' : 'none';

            // 重置缩放状态与标签
            pageZoom = 1.0;
            imageZoom = 1.0;
            if (pageZoomRange) pageZoomRange.value = 100;
            if (pageZoomLabel) pageZoomLabel.textContent = '100%';
            if (imageZoomRange) imageZoomRange.value = 100;
            if (imageZoomLabel) imageZoomLabel.textContent = '100%';

            // 初始渲染第一页
            renderPdfPage(1);
        } catch (err) {
            console.error('加载PDF失败:', err);
            showToast('PDF预览加载失败', 'error');
        }
    }).catch(() => {
        // 兜底：保持旧的iframe预览
        const pdfUrl = `/get_pdf/${fileId}#page=1`;
        // iOS内置不支持内联PDF时给出提示
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const tip = isIOS ? `<div class="placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">
                <div style="background:rgba(255,255,255,0.9);padding:10px 14px;border-radius:6px;color:#333;font-size:0.9em;">
                    PDF 预览受限。<a href="${pdfUrl}" target="_blank" style="color:#667eea;pointer-events:auto;">新标签页打开</a>
                </div>
            </div>` : '';
        originalContent.innerHTML = `
            <div style="position:relative;height:100%;">
                <iframe id=\"pdfIframe\" src=\"${pdfUrl}\" type=\"application/pdf\" style=\"width:100%;height:100%;border:none;\"></iframe>
                ${tip}
            </div>
        `;
        if (zoomControls) zoomControls.style.display = 'none';
    });
}

function ensureOriginalVisibleOnSmallScreens() {
    const isTabs = window.matchMedia('(max-width: 414px)').matches;
    if (isTabs) {
        // 切换到原文标签
        if (typeof setupMobileTabs === 'function') {
            if (tabOriginal && !tabOriginal.classList.contains('active')) {
                tabOriginal.click();
            }
        }
    }
}

// 渲染指定页（PDF.js）
async function renderPdfPage(pageNumber) {
    if (!pdfDoc) return;
    currentPage = pageNumber;
    const container = document.getElementById('pdfSvgContainer');
    if (!container) return;
    container.innerHTML = '';

    try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: pageZoom });

        async function renderCanvas() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const dpr = (window.devicePixelRatio || 1);
            // CSS大小按viewport尺寸展示
            canvas.style.width = Math.ceil(viewport.width) + 'px';
            canvas.style.height = Math.ceil(viewport.height) + 'px';
            // 实际绘制分辨率乘以dpr，保证高DPI清晰
            canvas.width = Math.ceil(viewport.width * dpr);
            canvas.height = Math.ceil(viewport.height * dpr);
            canvas.style.background = '#fff';
            container.appendChild(canvas);
            const renderContext = {
                canvasContext: ctx,
                viewport,
                transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
            };
            await page.render(renderContext).promise;
        }

        let rendered = false;
        if (pdfUseSVG) {
            try {
                const opList = await page.getOperatorList();
                const svgGfx = new pdfjsLib.SVGGraphics(page.commonObjs, page.objs);
                try { svgGfx.embedFonts = true; } catch (e) {}
                const svg = await svgGfx.getSVG(opList, viewport);
                svg.classList.add('pdf-svg-page');
                const cssW = Math.round(viewport.width);
                const cssH = Math.round(viewport.height);
                svg.setAttribute('width', cssW + 'px');
                svg.setAttribute('height', cssH + 'px');
                container.appendChild(svg);
                applyImageZoom(svg, imageZoom);
                rendered = true;
            } catch (svgErr) {
                console.warn('SVG渲染失败，切换到Canvas:', svgErr);
                if (imageZoomGroup) imageZoomGroup.style.display = 'none';
                pdfUseSVG = false;
            }
        }
        if (!rendered) {
            await renderCanvas();
        }

        // 更新UI状态
        pdfPageInput.value = currentPage;
        transPageInput.value = currentPage;
        updateNavigationButtons();
    } catch (e) {
        console.error('渲染PDF页面失败:', e);
        // 发生不可恢复错误时，回退为内置PDF预览
        if (currentFileId) {
            const pdfUrl = `/get_pdf/${currentFileId}#page=${pageNumber}`;
            originalContent.innerHTML = `
                <iframe id="pdfIframe" src="${pdfUrl}" type="application/pdf"></iframe>
            `;
            if (zoomControls) zoomControls.style.display = 'none';
        }
        showToast('渲染页面失败，已回退为内置预览', 'error');
    }
}

function applyImageZoom(svgElement, scale) {
    if (!svgElement) return;
    const images = svgElement.querySelectorAll('image');
    images.forEach(img => {
        img.style.transformOrigin = '0 0';
        img.style.transform = `scale(${scale})`;
    });
}

// 初始化页码导航
function initPageNavigation(total) {
    totalPages = total;
    currentPage = 1;

    // 显示导航控件
    pdfNavigation.style.display = 'flex';

    // 设置总页数
    pdfTotalPages.textContent = total;
    transTotalPages.textContent = total;

    // 设置输入框最大值
    pdfPageInput.max = total;
    transPageInput.max = total;

    // 重置页码
    pdfPageInput.value = 1;
    transPageInput.value = 1;

    updateNavigationButtons();
}

// 更新导航按钮状态
function updateNavigationButtons() {
    pdfPrevBtn.disabled = currentPage <= 1;
    pdfNextBtn.disabled = currentPage >= totalPages;
    transPrevBtn.disabled = currentPage <= 1;
    transNextBtn.disabled = currentPage >= totalPages;
}

// PDF页面跳转
function goToPdfPage(page) {
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    if (pdfDoc) {
        renderPdfPage(page);
    } else {
        const iframe = document.getElementById('pdfIframe');
        if (iframe) iframe.src = `/get_pdf/${currentFileId}#page=${page}`;
        pdfPageInput.value = page;
        transPageInput.value = page;
        updateNavigationButtons();
    }
    // 同步译文滚动
    scrollToTranslationPage(page);
}

// 滚动到译文指定页
function scrollToTranslationPage(page) {
    const pageElement = document.querySelector(`[data-page="${page}"]`);
    if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 监听译文区域滚动，自动更新页码
let scrollTimeout;
translatedContentDiv.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        updateCurrentPageFromScroll();
    }, 150);
});

// 根据滚动位置更新当前页码
function updateCurrentPageFromScroll() {
    const sections = translatedContentDiv.querySelectorAll('.page-section');
    const scrollTop = translatedContentDiv.scrollTop;
    const containerTop = translatedContentDiv.offsetTop;

    let foundPage = 1;
    sections.forEach(section => {
        const sectionTop = section.offsetTop - translatedContentDiv.offsetTop;
        if (sectionTop <= scrollTop + 50) {
            foundPage = parseInt(section.getAttribute('data-page'));
        }
    });

    if (foundPage !== currentPage) {
        currentPage = foundPage;
        pdfPageInput.value = foundPage;
        transPageInput.value = foundPage;
        updateNavigationButtons();

        // 同步PDF页面（不使用动画，避免循环）
        if (pdfDoc) {
            renderPdfPage(foundPage);
        } else {
            const iframe = document.getElementById('pdfIframe');
            if (iframe && currentFileId) {
                iframe.src = `/get_pdf/${currentFileId}#page=${foundPage}`;
            }
        }
    }
}

// 翻译按钮点击
translateBtn.addEventListener('click', async () => {
    if (!pdfContent) {
        showToast('请先上传PDF文件', 'error');
        return;
    }

    // 验证API配置
    if (apiConfig.type === 'deeplx' && !apiConfig.deeplxUrl) {
        showToast('请先配置DeepLX API地址', 'error');
        return;
    }
    if (apiConfig.type === 'aliyun' && !apiConfig.aliyunKey) {
        showToast('请先配置阿里云API Key', 'error');
        return;
    }

    translateBtn.disabled = true;
    progressBar.style.display = 'block';
    translatedContent = [];
    translatedContentDiv.innerHTML = '<div class="placeholder"><p>正在翻译中...</p></div>';

    const totalPages = pdfContent.length;
    let completedPages = 0;

    for (const page of pdfContent) {
        try {
            console.log(`开始翻译第 ${page.page} 页，文本长度: ${page.text.length} 字符`);
            // 同步PDF原文到当前翻译页
            goToPdfPage(page.page);
            const translated = await translateText(page.text);
            translatedContent.push({
                page: page.page,
                text: translated
            });

            completedPages++;
            updateProgress(completedPages, totalPages);

            // 实时显示翻译结果
            displayTranslatedContent(translatedContent);
            // 将译文滚动到当前页，保持两侧同步
            scrollToTranslationPage(page.page);
            console.log(`第 ${page.page} 页翻译完成`);

        } catch (error) {
            console.error(`翻译第${page.page}页出错:`, error);
            showToast(`翻译第${page.page}页时出错: ${error.message}`, 'error');
            // 继续翻译下一页，不中断
        }
    }

    translateBtn.disabled = false;
    progressBar.style.display = 'none';

    // 显示导出选项
    exportSection.style.display = 'block';

    // 设置译文信息
    const transInfo = `翻译完成 (${totalPages}页)`;
    translatedPageInfo.textContent = transInfo;
    translatedPageInfo.title = transInfo;

    showToast('翻译完成！', 'success');
});

// 调用翻译API
async function translateText(text) {
    const payload = {
        text: text,
        source_lang: sourceLang.value,
        target_lang: targetLang.value,
        api_type: apiConfig.type
    };

    // 根据API类型添加不同的配置
    if (apiConfig.type === 'deeplx') {
        payload.api_url = apiConfig.deeplxUrl;
    } else if (apiConfig.type === 'aliyun') {
        payload.api_key = apiConfig.aliyunKey;
        payload.model = apiConfig.aliyunModel;
    }

    const response = await fetch('/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
        return result.translated_text;
    } else {
        throw new Error(result.error || '翻译失败');
    }
}

// 显示翻译内容
function displayTranslatedContent(content) {
    translatedContentDiv.innerHTML = '';

    content.forEach(page => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page-section';
        pageDiv.setAttribute('data-page', page.page);

        const pageNumber = document.createElement('div');
        pageNumber.className = 'page-number';
        pageNumber.textContent = `第 ${page.page} 页`;

        const pageText = document.createElement('div');
        pageText.className = 'page-text';
        pageText.textContent = page.text;

        pageDiv.appendChild(pageNumber);
        pageDiv.appendChild(pageText);
        translatedContentDiv.appendChild(pageDiv);
    });

    // 显示译文导航
    if (content.length > 0) {
        translationNavigation.style.display = 'flex';
    }
}

// 更新进度条
function updateProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    progressFill.style.width = percentage + '%';
    progressText.textContent = `${percentage}% (${completed}/${total})`;
}

// 菜单中的复制译文
menuCopyBtn.addEventListener('click', () => {
    if (translatedContent.length === 0) {
        showToast('没有可复制的内容', 'error');
        return;
    }
    
    const text = translatedContent.map(page => 
        `第 ${page.page} 页\n${page.text}\n`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('译文已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败', 'error');
    });
});

// 菜单中的下载TXT
menuDownloadTxtBtn.addEventListener('click', () => {
    if (translatedContent.length === 0) {
        showToast('没有可下载的内容', 'error');
        return;
    }

    const text = translatedContent.map(page =>
        `第 ${page.page} 页\n${'='.repeat(50)}\n${page.text}\n\n`
    ).join('');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '翻译结果.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('TXT文件已下载', 'success');
});

// 菜单中的下载PDF
menuDownloadPdfBtn.addEventListener('click', async () => {
    if (translatedContent.length === 0) {
        showToast('没有可下载的内容', 'error');
        return;
    }

    showToast('正在生成PDF...', 'success');

    try {
        const response = await fetch('/download_pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pages: translatedContent,
                filename: '翻译结果.pdf'
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '翻译结果.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('PDF文件已下载', 'success');
        } else {
            const error = await response.json();
            showToast(error.error || 'PDF生成失败', 'error');
        }
    } catch (error) {
        console.error('下载PDF出错:', error);
        showToast('下载PDF时出错: ' + error.message, 'error');
    }
});

// 显示提示消息
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// 图片缩放事件
if (imageZoomRange) {
    imageZoomRange.addEventListener('input', () => {
        const val = parseInt(imageZoomRange.value, 10) || 100;
        imageZoom = Math.max(0.1, val / 100);
        imageZoomLabel.textContent = `${val}%`;
        const svg = document.querySelector('#pdfSvgContainer .pdf-svg-page');
        if (svg) applyImageZoom(svg, imageZoom);
    });
}

// 页面缩放事件（SVG与Canvas都支持）
if (pageZoomRange) {
    pageZoomRange.addEventListener('input', () => {
        const val = parseInt(pageZoomRange.value, 10) || 100;
        pageZoom = Math.max(0.25, val / 100);
        pageZoomLabel.textContent = `${val}%`;
        if (pdfDoc) {
            renderPdfPage(currentPage);
        } else {
            // iframe模式无法控制页面缩放
        }
    });
}
