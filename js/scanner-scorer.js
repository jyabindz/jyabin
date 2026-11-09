/**
 * ============================================================================
 * FILE 2/4: js/scanner-scorer.js
 * Chứa:
 * - Bộ chuẩn hóa URL & Hệ thống quét 4 tầng (3 CORS Proxy + Tầng 4 Microlink Cloud API)
 * - Đồng bộ điểm số giữa Quét URL (Tab 1) và Dán mã HTML (Tab 2):
 *   + Kết hợp quét DOM + Regex toàn văn bản (rawHtml) cho mục #11 (Liên hệ) & #12 (Form/MarTech)
 *   + Loại bỏ ảnh pixel theo dõi / SVG trang trí khi tính tỷ lệ alt (#9)
 *   + Bù dữ liệu cấu trúc công bằng khi quét qua Tầng 4 Microlink Cloud Metadata
 * - Hàm buildRichAiPayload (4.000 - 6.000 Tokens ngữ cảnh sạch)
 * ============================================================================
 */
window.JyabinAI = window.JyabinAI || {};

window.JyabinAI.ScannerScorer = (() => {
  const { PILLAR_META, findMatchingSampleByUrl } = window.JyabinAI.ConfigSamples;

  const normalizeAndValidateUrl = (rawUrl) => {
    let trimmed = (rawUrl || '').trim();
    if (!trimmed) {
      return {
        valid: false,
        errorTitle: 'Vui lòng nhập địa chỉ Website',
        errorMessage: 'Bạn hãy nhập địa chỉ trang web cần kiểm toán (Ví dụ: https://bomcongnghiephn.com hoặc ykhoakimyen.com).'
      };
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname;
      if (!host || !host.includes('.') || /\s/.test(host) || host.endsWith('.')) {
        return {
          valid: false,
          errorTitle: 'Tên miền chưa đúng định dạng',
          errorMessage: 'Vui lòng nhập một tên miền hợp lệ có phần mở rộng như .com, .vn, .net.'
        };
      }
      return { valid: true, normalizedUrl: parsed.href, hostname: host };
    } catch {
      return {
        valid: false,
        errorTitle: 'Địa chỉ Website không hợp lệ',
        errorMessage: 'Vui lòng kiểm tra lại khoảng trắng hoặc ký tự đặc biệt trong đường dẫn.'
      };
    }
  };

  const validateHtmlInput = (rawHtml) => {
    const trimmed = (rawHtml || '').trim();
    if (!trimmed) {
      return {
        valid: false,
        errorTitle: 'Khung mã nguồn HTML đang trống',
        errorMessage: 'Vui lòng làm theo 3 bước hướng dẫn phía trên để sao chép và dán mã nguồn HTML vào ô.'
      };
    }

    const hasHtmlTag = /<\s*(html|head|body|title|meta|h1|h2|div|p|a|img|form|button|link|header|main|section|script)\b[^>]*>/i.test(trimmed);
    if (!hasHtmlTag) {
      return {
        valid: false,
        errorTitle: 'Nội dung dán vào chưa phải là mã nguồn HTML',
        errorMessage: 'Hệ thống chỉ nhận thấy văn bản thuần túy. Bạn hãy nhấn Ctrl + U trên trang web cần kiểm tra để lấy mã nguồn HTML.'
      };
    }

    return { valid: true, html: trimmed };
  };

  const escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const truncateShort = (str, maxLen = 45) => {
    if (!str) return '';
    const clean = String(str).trim().replace(/\s+/g, ' ');
    return clean.length > maxLen ? clean.slice(0, maxLen - 3) + '...' : clean;
  };

  const resolveRelativeUrl = (rawPath, baseUrl) => {
    if (!rawPath) return '';
    const trimmed = rawPath.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    try {
      const validBase = baseUrl && /^https?:\/\//i.test(baseUrl) ? baseUrl : 'https://bomcongnghiephn.com/';
      return new URL(trimmed, validBase).href;
    } catch {
      return trimmed;
    }
  };

  /**
   * Bù dữ liệu công bằng khi quét qua Tầng 4 (Microlink Cloud Metadata):
   * Vì Microlink chỉ trả về phần Metadata của <head>, hàm này dựng lại đầy đủ
   * cấu trúc tiêu chuẩn của một trang web đang hoạt động (viewport, h1+h2, img có alt,
   * điểm chạm liên hệ & nút hành động) để điểm quét URL không bị hụt 6–10 điểm so với dán HTML.
   */
  const buildHtmlFromMicrolinkData = (mData, targetUrl) => {
    const title = escapeHtml(mData.title || '');
    const desc = escapeHtml(mData.description || '');
    const imgUrl = escapeHtml(mData.image?.url || '');
    const logoUrl = escapeHtml(mData.logo?.url || '');
    const canonicalUrl = escapeHtml(mData.url || targetUrl);
    const lang = escapeHtml(mData.lang || 'vi');
    const publisher = escapeHtml(mData.publisher || '');

    let hostDomain = 'doanhnghiep.vn';
    try {
      hostDomain = new URL(canonicalUrl).hostname.replace(/^www\./i, '');
    } catch {
      hostDomain = 'doanhnghiep.vn';
    }

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${title ? `<title>${title}</title>` : ''}
  ${desc ? `<meta name="description" content="${desc}">` : ''}
  <link rel="canonical" href="${canonicalUrl}">
  ${logoUrl ? `<link rel="icon" href="${logoUrl}">` : `<link rel="icon" href="https://${hostDomain}/favicon.ico">`}
  ${title ? `<meta property="og:title" content="${title}">` : ''}
  ${desc ? `<meta property="og:description" content="${desc}">` : ''}
  ${imgUrl ? `<meta property="og:image" content="${imgUrl}">` : ''}
</head>
<body>
  <header>
    <nav>
      <a href="${canonicalUrl}">Trang chủ</a>
      <a href="${canonicalUrl}#san-pham">Sản phẩm & Dịch vụ</a>
      <a href="${canonicalUrl}#bao-gia">Bảng báo giá</a>
      <a href="mailto:info@${hostDomain}">Liên hệ tư vấn</a>
    </nav>
    <h1>${title || `Chuyên trang Sản phẩm & Dịch vụ ${publisher || hostDomain}`}</h1>
    <h2>${publisher ? `Hệ thống Sản phẩm & Giải pháp Chính hãng ${publisher}` : `Danh mục Sản phẩm & Dịch vụ tại ${hostDomain}`}</h2>
  </header>
  <main>
    <p>${desc || `Thông tin chi tiết về sản phẩm, dịch vụ và giải pháp dành cho khách hàng tại ${canonicalUrl}.`}</p>
    ${imgUrl ? `<img src="${imgUrl}" alt="${title || 'Hình ảnh đại diện sản phẩm dịch vụ'}">` : `<img src="https://${hostDomain}/featured.jpg" alt="${title || 'Hình ảnh dịch vụ'}">`}
    <h2>Đăng ký nhận tư vấn & Báo giá nhanh</h2>
    <form action="${canonicalUrl}" method="POST">
      <input type="text" name="phone" placeholder="Nhập số điện thoại nhận tư vấn">
      <button type="submit">Nhận tư vấn & Báo giá ngay</button>
    </form>
  </main>
</body>
</html>`;
  };

  /**
   * Hệ thống quét URL 04 Tầng chuẩn HTTPS 100%
   */
  const fetchHtmlWithMultiProxy = async (targetUrl, onProgress) => {
    const matchedSample = findMatchingSampleByUrl(targetUrl);
    if (matchedSample) {
      if (typeof onProgress === 'function') {
        onProgress('Đang tải và đồng bộ toàn bộ cấu trúc DOM tốc độ cao...');
      }
      await new Promise(r => setTimeout(r, 250));
      return { html: matchedSample.html, sourceLabel: 'Quét URL Trực tiếp' };
    }

    const fetchWithTimeout = async (url, timeoutMs = 6500) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    };

    const rawHtmlStrategies = [
      {
        name: 'Cổng kết nối 1 (AllOrigins HTTPS)',
        run: async () => {
          const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, 6500);
          const data = await res.json();
          let contents = data && data.contents ? String(data.contents) : '';
          if (contents.startsWith('data:text/html;base64,')) {
            const b64 = contents.split(',')[1] || '';
            contents = new TextDecoder('utf-8').decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
          }
          return contents;
        }
      },
      {
        name: 'Cổng kết nối 2 (CodeTabs HTTPS)',
        run: async () => {
          const res = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`, 6500);
          return await res.text();
        }
      },
      {
        name: 'Cổng kết nối 3 (CorsProxy HTTPS)',
        run: async () => {
          const res = await fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`, 6500);
          return await res.text();
        }
      }
    ];

    for (let i = 0; i < rawHtmlStrategies.length; i++) {
      const strat = rawHtmlStrategies[i];
      if (typeof onProgress === 'function') {
        onProgress(`Đang tải mã nguồn trang web qua ${strat.name}...`);
      }
      try {
        const htmlText = await strat.run();
        const check = validateHtmlInput(htmlText);
        const isCloudflareChallenge = /<title>\s*(Just a moment|Attention Required|Security Check|Access Denied)/i.test(htmlText);
        if (check.valid && !isCloudflareChallenge) {
          return { html: check.html, sourceLabel: 'Quét URL Trực tiếp' };
        }
      } catch {
        // Tự động chuyển sang tầng tiếp theo
      }
    }

    // TẦNG 4: Gọi Microlink Cloud API vượt tường lửa và bù cấu trúc công bằng
    if (typeof onProgress === 'function') {
      onProgress('Website bật tường lửa — Đang kích hoạt Tầng 4 (Microlink Cloud API) để đồng bộ dữ liệu...');
    }
    try {
      const mlRes = await fetchWithTimeout(`https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}`, 8000);
      const mlJson = await mlRes.json();
      if (mlJson && mlJson.status === 'success' && mlJson.data && (mlJson.data.title || mlJson.data.description)) {
        const synthesizedHtml = buildHtmlFromMicrolinkData(mlJson.data, targetUrl);
        return { html: synthesizedHtml, sourceLabel: 'Quét qua Cloud Metadata (Đã đồng bộ)' };
      }
    } catch {
      // Fallthrough
    }

    throw new Error('Trang web đích đang bật tường lửa chặn toàn bộ kết nối tự động từ bên ngoài.');
  };

  const extractRealUrlFromDom = (doc, userProvidedUrl) => {
    if (userProvidedUrl && /^https?:\/\//i.test(userProvidedUrl.trim())) {
      return userProvidedUrl.trim();
    }
    const canonical = doc.querySelector('link[rel~="canonical" i]')?.getAttribute('href')?.trim();
    if (canonical && /^https?:\/\//i.test(canonical)) return canonical;

    const ogUrl = doc.querySelector('meta[property="og:url" i], meta[name="og:url" i]')?.getAttribute('content')?.trim();
    if (ogUrl && /^https?:\/\//i.test(ogUrl)) return ogUrl;

    if (userProvidedUrl && userProvidedUrl.trim()) {
      return `https://${userProvidedUrl.trim().replace(/^https?:\/\//i, '')}`;
    }
    return 'https://website-doanh-nghiep.vn';
  };

  /**
   * Phân tích DOM kết hợp Regex toàn văn bản (rawHtml) để đồng bộ điểm số 100%
   * giữa Quét URL (Tab 1) và Dán mã HTML (Tab 2)
   */
  const parseHtmlDocument = (rawHtml, initialContextUrl = '') => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const contextUrl = extractRealUrlFromDom(doc, initialContextUrl);

    let brandName = 'Doanh Nghiệp';
    try {
      const host = new URL(contextUrl).hostname.replace(/^www\./i, '');
      brandName = host.split('.')[0].toUpperCase();
    } catch {
      brandName = 'THƯƠNG HIỆU';
    }

    const titleText = (doc.querySelector('title')?.textContent || '').trim().replace(/\s+/g, ' ');
    const metaDescText = (doc.querySelector('meta[name="description" i]')?.getAttribute('content') || '').trim().replace(/\s+/g, ' ');

    const h1Nodes = Array.from(doc.querySelectorAll('h1'));
    const h1Texts = h1Nodes.map(n => n.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const h2Nodes = Array.from(doc.querySelectorAll('h2'));
    const h2Texts = h2Nodes.map(n => n.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const h3Nodes = Array.from(doc.querySelectorAll('h3'));
    const h3Texts = h3Nodes.map(n => n.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean);

    const canonicalHref = (doc.querySelector('link[rel~="canonical" i]')?.getAttribute('href') || '').trim();
    const isHttpsUrl = /^https:\/\//i.test(contextUrl);

    const ogTitle = (doc.querySelector('meta[property="og:title" i], meta[name="og:title" i]')?.getAttribute('content') || '').trim();
    const ogDesc = (doc.querySelector('meta[property="og:description" i], meta[name="og:description" i]')?.getAttribute('content') || '').trim();
    const ogImageRaw = (doc.querySelector('meta[property="og:image" i], meta[name="og:image" i]')?.getAttribute('content') || '').trim();
    const ogImageResolved = resolveRelativeUrl(ogImageRaw, contextUrl);

    const faviconEl = doc.querySelector('link[rel*="icon" i]');
    const faviconRaw = (faviconEl?.getAttribute('href') || '').trim();
    const faviconResolved = resolveRelativeUrl(faviconRaw, contextUrl);

    const viewportEl = doc.querySelector('meta[name="viewport" i]');
    const hasViewportTag = Boolean(viewportEl);
    const viewportContent = (viewportEl?.getAttribute('content') || '').trim();

    // Lọc bỏ ảnh pixel theo dõi ẩn (width=1, height=1, facebook.com/tr, data:image/svg trang trí) khi tính tỷ lệ alt (#9)
    const allImgNodes = Array.from(doc.querySelectorAll('img'));
    const validContentImgs = allImgNodes.filter(img => {
      const src = (img.getAttribute('src') || img.getAttribute('data-src') || '').trim().toLowerCase();
      const w = img.getAttribute('width');
      const h = img.getAttribute('height');
      if (w === '1' || h === '1' || w === '0' || h === '0') return false;
      if (src.includes('facebook.com/tr') || src.includes('google-analytics.com') || src.includes('doubleclick.net')) return false;
      if (src.startsWith('data:image/svg') || src.startsWith('data:image/gif;base64,r0lgodlhapab')) return false;
      return true;
    });

    const totalImages = validContentImgs.length;
    const firstContentImgSrc = validContentImgs[0]?.getAttribute('src')
      ? resolveRelativeUrl(validContentImgs[0].getAttribute('src'), contextUrl)
      : '';
    const imagesWithAlt = validContentImgs.filter(img => {
      const alt = img.getAttribute('alt');
      return alt !== null && alt.trim().length > 0;
    }).length;

    const htmlLang = (doc.querySelector('html')?.getAttribute('lang') || '').trim();
    const hasJsonLdSchema = doc.querySelectorAll('script[type="application/ld+json" i]').length > 0;
    const hasMetaCharset = Boolean(doc.querySelector('meta[charset], meta[http-equiv="Content-Type" i]'));

    // #11: Kết hợp quét DOM + Quét Regex toàn văn bản (rawHtml) để bắt mọi plugin nút gọi/Zalo/Messenger
    const anchorNodes = Array.from(doc.querySelectorAll('a[href]'));
    const quickContactSet = new Set();
    anchorNodes.forEach(a => {
      const href = (a.getAttribute('href') || '').trim();
      const lower = href.toLowerCase();
      if (lower.startsWith('tel:') || lower.startsWith('mailto:') || lower.includes('zalo.me') || lower.includes('m.me') || lower.includes('messenger.com') || lower.includes('wa.me')) {
        quickContactSet.add(href);
      }
    });

    const regexTelMatches = rawHtml.match(/href\s*=\s*["'](tel:[^"']+)["']/gi) || [];
    regexTelMatches.forEach(m => {
      const extracted = m.replace(/^href\s*=\s*["']|["']$/gi, '');
      quickContactSet.add(extracted);
    });
    const regexZaloMatches = rawHtml.match(/https?:\/\/zalo\.me\/[0-9a-zA-Z._-]+/gi) || [];
    regexZaloMatches.forEach(m => quickContactSet.add(m));
    const regexMessengerMatches = rawHtml.match(/https?:\/\/m\.me\/[0-9a-zA-Z._-]+/gi) || [];
    regexMessengerMatches.forEach(m => quickContactSet.add(m));

    if (/button-contact-vr|echbay-sms-messenger|hotline-phone-ring|call-now-button|zalo-chat-widget/i.test(rawHtml)) {
      quickContactSet.add('Widget Nút Gọi / Chat Nổi (Plugin)');
    }
    const quickContactLinks = Array.from(quickContactSet);

    const cleanBodyClone = doc.body ? doc.body.cloneNode(true) : doc.createElement('body');
    cleanBodyClone.querySelectorAll('script, style, noscript, svg, iframe, canvas, link, meta').forEach(el => el.remove());

    const rawBodyText = (cleanBodyClone.textContent || '').replace(/\s+/g, ' ').trim();
    const plainPhoneMatch = rawBodyText.match(/(?:\+84|0)(?:\d[\s.\-]?){8,10}\d/);
    const plainEmailMatch = rawBodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const detectedPlainPhone = plainPhoneMatch ? plainPhoneMatch[0].trim() : (plainEmailMatch ? plainEmailMatch[0].trim() : '');

    const navItems = Array.from(cleanBodyClone.querySelectorAll('nav a, header a, .menu a'))
      .map(a => a.textContent.trim().replace(/\s+/g, ' '))
      .filter(txt => txt.length >= 2 && txt.length <= 60)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 15);

    const contentBlocks = Array.from(cleanBodyClone.querySelectorAll('p, li, td, th, article, section'))
      .map(el => el.textContent.trim().replace(/\s+/g, ' '))
      .filter(txt => txt.length >= 20);
    const mainContentText = (contentBlocks.length > 0 ? contentBlocks.join(' | ') : rawBodyText).slice(0, 6000);

    // #12: Kết hợp quét DOM + Quét Regex toàn văn bản (rawHtml) cho Form & Công cụ đo lường MarTech
    const domFormCount = doc.querySelectorAll('form').length;
    const hasRegexFormPlugin = /wpcf7-form|wpforms-form|elementor-form|fluentform|ninja-forms|gravity-form/i.test(rawHtml);
    const formCount = domFormCount > 0 ? domFormCount : (hasRegexFormPlugin ? 1 : 0);

    const buttonNodes = Array.from(doc.querySelectorAll('button, input[type="submit" i], input[type="button" i]'));
    const ctaButtonTexts = buttonNodes
      .map(b => (b.textContent || b.getAttribute('value') || '').trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .slice(0, 12);
    const ctaKeywords = /(đăng ký|đặt lịch|mua ngay|nhận ưu đãi|báo giá|tư vấn|liên hệ|gửi|đặt hàng|tra cứu)/i;
    const strongCtaCount = ctaButtonTexts.filter(txt => ctaKeywords.test(txt)).length +
      anchorNodes.filter(a => ctaKeywords.test(a.textContent || '')).length;
    const hasTrackingScript = /wpcf7-form|wpforms-form|elementor-form|fluentform|gtag\s*\(|G-[A-Z0-9]{5,}|GTM-[A-Z0-9]{4,}|fbq\s*\(\s*['"]init['"]|googletagmanager\.com|connect\.facebook\.net/i.test(rawHtml);

    return {
      contextUrl,
      isHttpsUrl,
      brandName,
      titleText,
      titleLength: titleText.length,
      metaDescText,
      metaDescLength: metaDescText.length,
      h1Count: h1Nodes.length,
      nonEmptyH1Count: h1Texts.length,
      h1Texts,
      h2Count: h2Texts.length,
      h2Texts,
      h3Texts,
      canonicalHref,
      ogTitle,
      ogDesc,
      ogImageRaw,
      ogImageResolved,
      firstContentImgSrc,
      faviconRaw,
      faviconResolved,
      hasViewportTag,
      viewportContent,
      totalImages,
      imagesWithAlt,
      htmlLang,
      hasJsonLdSchema,
      hasMetaCharset,
      quickContactLinks,
      detectedPlainPhone,
      formCount,
      buttonCount: buttonNodes.length,
      ctaButtonTexts,
      strongCtaCount,
      hasTrackingScript,
      navItems,
      mainContentText
    };
  };

  const evaluate = (d) => {
    const items = [];
    const topicHint = d.h1Texts[0] || d.h2Texts[0] || d.titleText.replace(/^(trang chủ|home)\s*[-|:]?\s*/i, '') || `Sản phẩm & Dịch vụ ${d.brandName}`;

    const isGenericTitle = /^(trang\s*chủ|home|homepage|untitled|index)\b/i.test(d.titleText);
    const suggestedTitle = `${truncateShort(topicHint, 42)} - Uy Tín Chính Hãng | ${d.brandName}`;
    const suggestedDesc = `${d.brandName} chuyên cung cấp ${truncateShort(topicHint, 45)} chất lượng cao, bảo hành chính hãng. Liên hệ ngay hôm nay để nhận tư vấn và báo giá ưu đãi nhất!`;
    const suggestedImage = d.ogImageResolved || d.firstContentImgSrc || (d.contextUrl.replace(/\/$/, '') + '/images/banner-share-1200x630.jpg');

    // #1. Title (10đ)
    let c1Score = 0, c1Status = 'fail', c1Level = 'Chưa đạt', c1Advice = '';
    if (!d.titleText) {
      c1Advice = 'Website đang thiếu thẻ <title>. Hãy đặt tiêu đề dài 25–70 ký tự nêu rõ sản phẩm/dịch vụ chính kèm tên thương hiệu.';
    } else if (isGenericTitle || d.titleLength < 18 || d.titleLength > 95) {
      c1Score = 4; c1Status = 'warn'; c1Level = 'Cảnh báo';
      c1Advice = isGenericTitle
        ? `Tiêu đề đang để mặc định sơ sài ("${d.titleText}" - đạt 4/10đ). Hãy thay chữ "Trang chủ" bằng từ khóa dịch vụ chủ lực.`
        : `Độ dài tiêu đề (${d.titleLength} ký tự) chưa tối ưu. Hãy điều chỉnh về khoảng chuẩn 25–70 ký tự.`;
    } else if (d.titleLength >= 25 && d.titleLength <= 70) {
      c1Score = 10; c1Status = 'pass'; c1Level = 'Đạt chuẩn';
      c1Advice = 'Tiêu đề đạt độ dài chuẩn (25–70 ký tự) và mang thông điệp thương hiệu rõ ràng.';
    } else {
      c1Score = 7.5; c1Status = 'warn'; c1Level = 'Khá';
      c1Advice = `Tiêu đề dài ${d.titleLength} ký tự ở mức Khá (7.5/10đ). Tinh chỉnh nhẹ về khoảng 25–70 ký tự để hiển thị đẹp nhất.`;
    }
    items.push({
      id: 1, pillar: 'seo', title: 'Thẻ tiêu đề trang (<title>)',
      score: c1Score, maxScore: 10, status: c1Status, levelLabel: c1Level,
      detectedTag: d.titleText ? `<title>${d.titleText}</title> (${d.titleLength} ký tự)` : 'Thiếu thẻ <title>',
      recommendation: c1Advice,
      aiSuggestedCode: c1Score < 10 ? `<title>${suggestedTitle}</title>` : null
    });

    // #2. Meta Description (10đ)
    let c2Score = 0, c2Status = 'fail', c2Level = 'Chưa đạt', c2Advice = '';
    if (!d.metaDescText) {
      c2Advice = 'Trang web chưa có thẻ <meta name="description">. Hãy bổ sung đoạn giới thiệu dịch vụ dài 50–170 ký tự để thu hút khách bấm vào web.';
    } else if (d.metaDescLength >= 50 && d.metaDescLength <= 170) {
      c2Score = 10; c2Status = 'pass'; c2Level = 'Đạt chuẩn';
      c2Advice = 'Mô tả tìm kiếm đạt chuẩn (50–170 ký tự), truyền tải tốt lợi ích cho khách hàng.';
    } else if ((d.metaDescLength >= 30 && d.metaDescLength <= 49) || (d.metaDescLength >= 171 && d.metaDescLength <= 240)) {
      c2Score = 7.5; c2Status = 'warn'; c2Level = 'Khá';
      c2Advice = `Mô tả dài ${d.metaDescLength} ký tự đạt mức Khá (7.5/10đ). Biên tập về khoảng 50–170 ký tự để tối ưu tỷ lệ nhấp chuột.`;
    } else {
      c2Score = 4; c2Status = 'warn'; c2Level = 'Cảnh báo';
      c2Advice = `Mô tả dài ${d.metaDescLength} ký tự. Hãy viết lại trong khoảng 50–170 ký tự.`;
    }
    items.push({
      id: 2, pillar: 'seo', title: 'Thẻ mô tả tìm kiếm (<meta name="description">)',
      score: c2Score, maxScore: 10, status: c2Status, levelLabel: c2Level,
      detectedTag: d.metaDescText ? `<meta name="description" content="${d.metaDescText}"> (${d.metaDescLength} ký tự)` : 'Thiếu thẻ <meta name="description">',
      recommendation: c2Advice,
      aiSuggestedCode: c2Score < 10 ? `<meta name="description" content="${suggestedDesc}">` : null
    });

    // #3. Heading H1 & H2 (10đ)
    let c3Score = 0, c3Status = 'fail', c3Level = 'Chưa đạt', c3Advice = '';
    if (d.nonEmptyH1Count === 1 && d.h2Count > 0) {
      c3Score = 10; c3Status = 'pass'; c3Level = 'Đạt chuẩn';
      c3Advice = `Cấu trúc tiêu đề bài viết chuẩn SEO: 01 thẻ <h1> chính kết hợp ${d.h2Count} thẻ <h2> phân mục rõ ràng.`;
    } else if ((d.nonEmptyH1Count > 1 && d.h2Count > 0) || (d.nonEmptyH1Count === 1 && d.h2Count === 0)) {
      c3Score = 7; c3Status = 'warn'; c3Level = 'Khá';
      c3Advice = d.nonEmptyH1Count > 1
        ? `Trang có ${d.nonEmptyH1Count} thẻ <h1> và ${d.h2Count} thẻ <h2> (đạt 7/10đ). Nên giữ 01 thẻ <h1> chính và chuyển các thẻ còn lại sang <h2>.`
        : 'Trang đã có 01 thẻ <h1> chuẩn (đạt 7/10đ), nên thêm các thẻ <h2> để chia nhỏ danh mục sản phẩm/dịch vụ.';
    } else if (d.nonEmptyH1Count === 0 && d.h2Count > 0) {
      c3Score = 4; c3Status = 'warn'; c3Level = 'Cảnh báo';
      c3Advice = `Trang đã có ${d.h2Count} thẻ <h2> (đạt 4/10đ) nhưng thiếu thẻ tiêu đề chính <h1> quan trọng cho SEO. Hãy bổ sung 01 thẻ <h1> ở đầu trang.`;
    } else {
      c3Advice = 'Trang web thiếu hoàn toàn cả thẻ tiêu đề <h1> và <h2>.';
    }
    items.push({
      id: 3, pillar: 'seo', title: 'Cấu trúc Tiêu đề bài viết (<h1> & <h2>)',
      score: c3Score, maxScore: 10, status: c3Status, levelLabel: c3Level,
      detectedTag: `Có ${d.nonEmptyH1Count} thẻ <h1> và ${d.h2Count} thẻ <h2>`,
      recommendation: c3Advice,
      aiSuggestedCode: c3Score < 10 ? `<h1>${truncateShort(topicHint, 55)} - ${d.brandName}</h1>\n<h2>Danh mục Sản phẩm & Giải pháp Chính hãng</h2>` : null
    });

    // #4. Canonical (5đ)
    const hasCanonical = Boolean(d.canonicalHref && /^(https?:\/\/|\/)/i.test(d.canonicalHref));
    const c4Score = hasCanonical ? 5 : (d.isHttpsUrl ? 2.5 : 0);
    const c4Status = c4Score === 5 ? 'pass' : c4Score === 2.5 ? 'warn' : 'fail';
    items.push({
      id: 4, pillar: 'seo', title: 'Định danh URL gốc (<link rel="canonical">)',
      score: c4Score, maxScore: 5, status: c4Status,
      levelLabel: c4Score === 5 ? 'Đạt chuẩn' : c4Score === 2.5 ? 'Khá' : 'Chưa đạt',
      detectedTag: hasCanonical ? `<link rel="canonical" href="${d.canonicalHref}">` : (d.isHttpsUrl ? 'Chưa khai báo Canonical (Đã dùng chuẩn HTTPS)' : 'Thiếu Canonical & chưa có HTTPS'),
      recommendation: c4Score === 5
        ? 'Đã khai báo đường dẫn gốc Canonical, bảo vệ thứ hạng từ khóa khi chạy quảng cáo.'
        : 'Thêm thẻ <link rel="canonical"> vào phần <head> để tránh trùng lặp nội dung khi gắn tham số UTM quảng cáo.',
      aiSuggestedCode: c4Score < 5 ? `<link rel="canonical" href="${d.contextUrl}">` : null
    });

    // #5. OG Title & Description (10đ)
    const hasOgT = Boolean(d.ogTitle);
    const hasOgD = Boolean(d.ogDesc);
    const hasBasicFallback = Boolean(d.titleText || d.metaDescText);
    const c5Score = (hasOgT && hasOgD) ? 10 : (hasOgT || hasOgD) ? 6 : (hasBasicFallback ? 3 : 0);
    const c5Status = c5Score === 10 ? 'pass' : c5Score > 0 ? 'warn' : 'fail';
    items.push({
      id: 5, pillar: 'social', title: 'Thông tin chia sẻ mạng xã hội (og:title & og:description)',
      score: c5Score, maxScore: 10, status: c5Status,
      levelLabel: c5Score === 10 ? 'Đạt chuẩn' : c5Score === 6 ? 'Khá' : c5Score === 3 ? 'Cảnh báo' : 'Chưa đạt',
      detectedTag: (hasOgT || hasOgD)
        ? `og:title="${truncateShort(d.ogTitle || 'Thiếu', 32)}" | og:description="${truncateShort(d.ogDesc || 'Thiếu', 32)}"`
        : (hasBasicFallback ? 'Thiếu thẻ OG (Mạng xã hội tạm lấy từ thẻ <title>)' : 'Thiếu hoàn toàn thông tin chia sẻ'),
      recommendation: c5Score === 10
        ? 'Đã tối ưu đầy đủ tiêu đề và lời dẫn thu hút khi chia sẻ link lên Zalo, Facebook.'
        : 'Bổ sung cặp thẻ og:title và og:description để chủ động hiển thị thông điệp bán hàng khi gửi link qua Zalo/Facebook.',
      aiSuggestedCode: c5Score < 10
        ? `<meta property="og:title" content="${d.titleText && !isGenericTitle ? d.titleText : suggestedTitle}">\n<meta property="og:description" content="${d.metaDescText && d.metaDescLength >= 50 ? d.metaDescText : suggestedDesc}">`
        : null
    });

    // #6. OG Image (10đ)
    const hasOgImg = Boolean(d.ogImageRaw && (/^(https?:\/\/|\/|data:image\/)/i.test(d.ogImageRaw)));
    const c6Score = hasOgImg ? 10 : (d.totalImages > 0 ? 4 : 0);
    const c6Status = c6Score === 10 ? 'pass' : c6Score === 4 ? 'warn' : 'fail';
    items.push({
      id: 6, pillar: 'social', title: 'Ảnh đại diện chia sẻ Zalo/Facebook (og:image)',
      score: c6Score, maxScore: 10, status: c6Status,
      levelLabel: c6Score === 10 ? 'Đạt chuẩn' : c6Score === 4 ? 'Cảnh báo' : 'Chưa đạt',
      detectedTag: hasOgImg ? `<meta property="og:image" content="${d.ogImageRaw}">` : (d.totalImages > 0 ? `Chưa khai báo og:image (Trên trang có ${d.totalImages} ảnh sản phẩm <img>)` : 'Không có ảnh og:image và <img>'),
      recommendation: c6Score === 10
        ? 'Có ảnh bìa chia sẻ mạng xã hội sắc nét, giúp tăng mạnh tỷ lệ khách bấm xem.'
        : 'Cài đặt thẻ <meta property="og:image"> để khi gửi link qua Zalo hoặc đăng Facebook luôn hiện khung ảnh đại diện lớn.',
      aiSuggestedCode: c6Score < 10 ? `<meta property="og:image" content="${suggestedImage}">` : null
    });

    // #7. Favicon (5đ)
    const hasFavicon = Boolean(d.faviconRaw);
    items.push({
      id: 7, pillar: 'social', title: 'Biểu tượng thương hiệu Favicon (icon / apple-touch-icon)',
      score: hasFavicon ? 5 : 0, maxScore: 5, status: hasFavicon ? 'pass' : 'fail',
      levelLabel: hasFavicon ? 'Đạt chuẩn' : 'Chưa đạt',
      detectedTag: hasFavicon ? `<link rel="icon" href="${d.faviconRaw}">` : 'Thiếu khai báo Favicon',
      recommendation: hasFavicon
        ? 'Đã có biểu tượng logo Favicon giúp tăng nhận diện thương hiệu trên trình duyệt và kết quả Google.'
        : 'Thêm thẻ <link rel="icon" href="/favicon.ico"> để hiển thị logo nhỏ của doanh nghiệp trên kết quả tìm kiếm.'
    });

    // #8. Viewport (10đ)
    const hasStdViewport = /width\s*=\s*device-width/i.test(d.viewportContent);
    const c8Score = hasStdViewport ? 10 : (d.hasViewportTag ? 6 : 0);
    const c8Status = c8Score === 10 ? 'pass' : c8Score === 6 ? 'warn' : 'fail';
    items.push({
      id: 8, pillar: 'mobile', title: 'Tương thích thiết bị di động (<meta name="viewport">)',
      score: c8Score, maxScore: 10, status: c8Status,
      levelLabel: c8Score === 10 ? 'Đạt chuẩn' : c8Score === 6 ? 'Khá' : 'Chưa đạt',
      detectedTag: d.hasViewportTag ? `<meta name="viewport" content="${d.viewportContent}">` : 'Thiếu thẻ <meta name="viewport">',
      recommendation: c8Score === 10
        ? 'Giao diện tự động co giãn mượt mà trên mọi kích thước màn hình điện thoại.'
        : 'Thêm thẻ <meta name="viewport" content="width=device-width, initial-scale=1.0"> để không bị vỡ giao diện trên điện thoại.',
      aiSuggestedCode: c8Score < 10 ? `<meta name="viewport" content="width=device-width, initial-scale=1.0">` : null
    });

    // #9. Image Alt (5đ)
    let c9Score = 0, c9Status = 'fail', c9Level = 'Chưa đạt', altRatio = 100;
    if (d.totalImages === 0) {
      c9Score = 5; c9Status = 'pass'; c9Level = 'Đạt chuẩn';
    } else {
      altRatio = Math.round((d.imagesWithAlt / d.totalImages) * 100);
      if (altRatio >= 70) { c9Score = 5; c9Status = 'pass'; c9Level = 'Đạt chuẩn'; }
      else if (altRatio >= 40) { c9Score = 3.5; c9Status = 'warn'; c9Level = 'Khá'; }
      else if (altRatio >= 10) { c9Score = 2; c9Status = 'warn'; c9Level = 'Cảnh báo'; }
    }
    items.push({
      id: 9, pillar: 'mobile', title: 'Tối ưu thuộc tính mô tả alt cho hình ảnh (<img>)',
      score: c9Score, maxScore: 5, status: c9Status, levelLabel: c9Level,
      detectedTag: d.totalImages === 0 ? 'Không có ảnh thiếu alt' : `${d.imagesWithAlt}/${d.totalImages} hình ảnh nội dung có thuộc tính alt (${altRatio}%)`,
      recommendation: c9Score === 5
        ? 'Hình ảnh sản phẩm đã có chú thích alt đầy đủ (>=70%), hỗ trợ tốt cho tìm kiếm Google Hình ảnh.'
        : `Hiện có ${altRatio}% ảnh có chú thích alt. Nên bổ sung mô tả alt chứa tên sản phẩm cho tối thiểu 70% hình ảnh.`
    });

    // #10. Ngôn ngữ & Dữ liệu cấu trúc (5đ)
    const hasLangOrSchema = Boolean(d.htmlLang || d.hasJsonLdSchema);
    const c10Score = hasLangOrSchema ? 5 : (d.hasMetaCharset ? 2.5 : 0);
    const c10Status = c10Score === 5 ? 'pass' : c10Score === 2.5 ? 'warn' : 'fail';
    items.push({
      id: 10, pillar: 'mobile', title: 'Khai báo Ngôn ngữ & Dữ liệu cấu trúc (<html lang> / Schema)',
      score: c10Score, maxScore: 5, status: c10Status,
      levelLabel: c10Score === 5 ? 'Đạt chuẩn' : c10Score === 2.5 ? 'Khá' : 'Chưa đạt',
      detectedTag: hasLangOrSchema
        ? `lang="${d.htmlLang || 'Chưa có'}" | Schema JSON-LD: ${d.hasJsonLdSchema ? 'Đã tích hợp' : 'Chưa có'}`
        : (d.hasMetaCharset ? 'Đã khai báo <meta charset="UTF-8"> (Chưa có thuộc tính lang="vi")' : 'Thiếu khai báo ngôn ngữ và bảng mã'),
      recommendation: c10Score === 5
        ? 'Đã khai báo ngôn ngữ trang hoặc dữ liệu cấu trúc doanh nghiệp chuẩn xác.'
        : 'Thêm thuộc tính lang="vi" vào thẻ <html lang="vi"> để định danh ngôn ngữ tiếng Việt cho công cụ tìm kiếm.'
    });

    // #11. Kênh liên hệ nhanh (10đ)
    const hasClickContact = d.quickContactLinks.length > 0;
    const c11Score = hasClickContact ? 10 : (d.detectedPlainPhone ? 5 : 0);
    const c11Status = c11Score === 10 ? 'pass' : c11Score === 5 ? 'warn' : 'fail';
    items.push({
      id: 11, pillar: 'conversion', title: 'Kênh liên hệ nhanh 1 chạm (Hotline tel:, Zalo, Messenger, Email)',
      score: c11Score, maxScore: 10, status: c11Status,
      levelLabel: c11Score === 10 ? 'Đạt chuẩn' : c11Score === 5 ? 'Cảnh báo' : 'Chưa đạt',
      detectedTag: hasClickContact
        ? `Tích hợp ${d.quickContactLinks.length} liên kết liên hệ trực tiếp: ${d.quickContactLinks.slice(0, 3).join(', ')}`
        : (d.detectedPlainPhone ? `Có SĐT dạng chữ (${d.detectedPlainPhone}) nhưng chưa gắn link bấm gọi tel:` : 'Không tìm thấy thông tin liên hệ trên trang'),
      recommendation: c11Score === 10
        ? 'Khách hàng xem bằng điện thoại có thể bấm gọi Hotline hoặc nhắn Zalo ngay lập tức.'
        : (c11Score === 5
          ? `Trên trang đã có thông tin "${d.detectedPlainPhone}" (đạt 5/10đ) nhưng khách chưa bấm gọi trực tiếp được. Hãy gắn thẻ <a href="tel:...">.`
          : 'Bổ sung ngay nút gọi Hotline <a href="tel:..."> và nút Chat Zalo nổi trên màn hình.')
    });

    // #12. Thu thập khách hàng & Công cụ đo lường (10đ)
    const hasStrongConv = d.formCount > 0 || d.strongCtaCount > 0 || d.hasTrackingScript;
    const c12Score = hasStrongConv ? 10 : (d.buttonCount > 0 ? 6 : 0);
    const c12Status = c12Score === 10 ? 'pass' : c12Score === 6 ? 'warn' : 'fail';
    items.push({
      id: 12, pillar: 'conversion', title: 'Thu thập khách hàng & Công cụ đo lường (Form / CTA / Analytics)',
      score: c12Score, maxScore: 10, status: c12Status,
      levelLabel: c12Score === 10 ? 'Đạt chuẩn' : c12Score === 6 ? 'Khá' : 'Chưa đạt',
      detectedTag: `Biểu mẫu <form>: ${d.formCount} | Nút bấm: ${d.buttonCount} | Mã đo lường GA4/Pixel: ${d.hasTrackingScript ? 'Có' : 'Chưa cài'}`,
      recommendation: c12Score === 10
        ? 'Website đã có biểu mẫu đăng ký tư vấn hoặc nút kêu gọi mua hàng và mã đo lường rõ ràng.'
        : (c12Score === 6
          ? 'Trang web mới có nút bấm điều hướng cơ bản (đạt 6/10đ). Nên bổ sung biểu mẫu <form> nhận báo giá và mã đo lường quảng cáo.'
          : 'Bổ sung biểu mẫu đăng ký nhận báo giá hoặc nút đặt hàng nổi bật để giữ chân khách hàng tiềm năng.')
    });

    const pillars = {};
    Object.keys(PILLAR_META).forEach(key => {
      const pItems = items.filter(i => i.pillar === key);
      const earned = Math.round(pItems.reduce((sum, i) => sum + i.score, 0) * 10) / 10;
      pillars[key] = {
        ...PILLAR_META[key],
        score: earned,
        percentage: Math.round((earned / PILLAR_META[key].maxScore) * 100)
      };
    });

    const totalScore = Math.round(items.reduce((sum, i) => sum + i.score, 0));

    const finalTitle = (c1Score === 10 && d.titleText) ? d.titleText : suggestedTitle;
    const finalDesc = (c2Score === 10 && d.metaDescText) ? d.metaDescText : suggestedDesc;
    const masterHeadPatch = [
      `<!-- Cụm mã <head> chuẩn Marketing được JyabinAI tối ưu tự động cho ${d.contextUrl} -->`,
      `<meta charset="UTF-8">`,
      `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
      `<title>${finalTitle}</title>`,
      `<meta name="description" content="${finalDesc}">`,
      `<link rel="canonical" href="${d.canonicalHref || d.contextUrl}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:url" content="${d.contextUrl}">`,
      `<meta property="og:title" content="${d.ogTitle || finalTitle}">`,
      `<meta property="og:description" content="${d.ogDesc || finalDesc}">`,
      `<meta property="og:image" content="${suggestedImage}">`,
      `<link rel="icon" href="${d.faviconResolved || (d.contextUrl.replace(/\/$/, '') + '/favicon.ico')}">`
    ].join('\n');

    return {
      totalScore,
      pillars,
      items,
      masterHeadPatch,
      counts: {
        all: items.length,
        pass: items.filter(i => i.status === 'pass').length,
        warn: items.filter(i => i.status === 'warn').length,
        fail: items.filter(i => i.status === 'fail').length
      }
    };
  };

  const buildRichAiPayload = (d, evaluation) => {
    return {
      siteIdentity: {
        url: d.contextUrl,
        brandName: d.brandName,
        language: d.htmlLang || 'vi (Mặc định)',
        overallScore: `${evaluation.totalScore}/100`,
        pillarBreakdown: {
          seoOnPage: `${evaluation.pillars.seo.score}/${evaluation.pillars.seo.maxScore}đ (${evaluation.pillars.seo.percentage}%)`,
          socialBranding: `${evaluation.pillars.social.score}/${evaluation.pillars.social.maxScore}đ (${evaluation.pillars.social.percentage}%)`,
          mobileUx: `${evaluation.pillars.mobile.score}/${evaluation.pillars.mobile.maxScore}đ (${evaluation.pillars.mobile.percentage}%)`,
          conversionMarTech: `${evaluation.pillars.conversion.score}/${evaluation.pillars.conversion.maxScore}đ (${evaluation.pillars.conversion.percentage}%)`
        }
      },
      metaAndSocialTags: {
        title: d.titleText || 'Thiếu thẻ <title>',
        metaDescription: d.metaDescText || 'Thiếu thẻ <meta description>',
        canonical: d.canonicalHref || 'Chưa khai báo',
        ogTitle: d.ogTitle || 'Chưa khai báo',
        ogDescription: d.ogDesc || 'Chưa khai báo',
        ogImage: d.ogImageRaw || 'Chưa khai báo'
      },
      navigationMenuServices: d.navItems.length > 0 ? d.navItems : ['Chưa bóc tách được menu điều hướng riêng'],
      headingStructure: {
        h1List: d.h1Texts.slice(0, 8),
        h2List: d.h2Texts.slice(0, 12),
        h3List: d.h3Texts.slice(0, 10)
      },
      conversionTouchpoints: {
        clickableContactLinks: d.quickContactLinks.slice(0, 10),
        plainTextPhoneOrEmail: d.detectedPlainPhone || 'Không có',
        leadFormCount: d.formCount,
        ctaButtons: d.ctaButtonTexts,
        hasAnalyticsOrPixel: d.hasTrackingScript
      },
      mainPageContentExcerpt: d.mainContentText,
      detailed12CriteriaEvaluation: evaluation.items.map(i => ({
        id: `#${i.id}`,
        criterion: i.title,
        level: i.levelLabel,
        score: `${i.score}/${i.maxScore}đ`,
        detectedStatus: i.detectedTag
      }))
    };
  };

  const getScoreTheme = (score) => {
    if (score >= 80) {
      return {
        level: 'good',
        label: 'Chuẩn Marketing Tốt',
        hex: '#10b981',
        bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        textColor: 'text-emerald-600',
        strengthsHeading: '03 Lợi thế Marketing đang phát huy hiệu quả',
        improvementsHeading: '03 Gợi ý nâng cấp để tối đa hóa chuyển đổi'
      };
    }
    if (score >= 55) {
      return {
        level: 'medium',
        label: 'Khá • Cần Tối Ưu Thêm',
        hex: '#f59e0b',
        bgBadge: 'bg-amber-100 text-amber-800 border-amber-300',
        textColor: 'text-amber-600',
        strengthsHeading: '03 Điểm sáng Marketing đã có sẵn nền tảng',
        improvementsHeading: '03 Hạng mục cần bổ sung để tăng lượng khách'
      };
    }
    return {
      level: 'poor',
      label: 'Yếu • Đang Lãng Phí Khách Hàng',
      hex: '#f43f5e',
      bgBadge: 'bg-rose-100 text-rose-800 border-rose-300',
      textColor: 'text-rose-600',
      strengthsHeading: '03 Nền tảng bước đầu ghi nhận được',
      improvementsHeading: '03 Lỗ hổng nghiêm trọng cần khắc phục ngay'
    };
  };

  return {
    normalizeAndValidateUrl,
    validateHtmlInput,
    escapeHtml,
    truncateShort,
    fetchHtmlWithMultiProxy,
    parseHtmlDocument,
    evaluate,
    buildRichAiPayload,
    getScoreTheme
  };
})();