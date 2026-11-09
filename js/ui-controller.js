/**
 * ============================================================================
 * FILE 4/4: js/ui-controller.js
 * Chứa:
 * - Cập nhật chính xác nhãn AI theo cờ aiResult.isMock:
 *   + Khi aiResult.isMock === false: Hiển thị nhãn xanh "🟢 ✨ Phân tích chuyên sâu bởi JyabinAI"
 *   + Khi aiResult.isMock === true : Hiển thị nhãn vàng "🟡 Bản demo vòng loại - Dữ liệu mô phỏng AI"
 * - Kết nối nút Header "⚡ Cẩm nang Chuẩn Marketing SME" với Modal Quy trình 03 bước
 *   kèm nút cuộn mượt thẳng xuống khu vực Cụm mã <head> Vá lỗi tự động.
 * - Đồng bộ thương hiệu "JyabinAI" trên toàn bộ giao diện, khung Chat và báo cáo (.PDF, .DOC, Text).
 * ============================================================================
 */
window.JyabinAI = window.JyabinAI || {};

(() => {
  const { RUBRIC_BENTO_CARDS, getSampleById } = window.JyabinAI.ConfigSamples;
  const {
    normalizeAndValidateUrl,
    validateHtmlInput,
    escapeHtml,
    truncateShort,
    fetchHtmlWithMultiProxy,
    parseHtmlDocument,
    evaluate,
    getScoreTheme
  } = window.JyabinAI.ScannerScorer;
  const AIEngine = window.JyabinAI.AIEngine;

  let currentAuditRecord = null;
  let currentFilter = 'all';
  let currentStudioKit = null;

  const refreshIcons = () => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  };

  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colorClasses = type === 'error'
      ? 'bg-rose-600 text-white border-rose-700'
      : type === 'warning'
        ? 'bg-amber-500 text-white border-amber-600'
        : 'bg-slate-900 text-white border-slate-800';

    const iconName = type === 'error' ? 'alert-octagon' : type === 'warning' ? 'alert-triangle' : 'check-circle-2';

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs sm:text-sm font-bold transition-all duration-300 max-w-md ${colorClasses}`;
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
      <span class="break-words [overflow-wrap:anywhere]">${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  const copyTextToClipboard = async (text, successMsg = 'Đã sao chép vào Clipboard!') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMsg);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast(successMsg);
    }
  };

  const animateScoreCountUp = (targetScore, durationMs = 1100) => {
    const el = document.getElementById('overallScoreValue');
    if (!el) return;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(targetScore * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = String(targetScore);
      }
    };
    requestAnimationFrame(step);
  };

  /* --- XÂY DỰNG BÁO CÁO TEXT, WORD (.DOC) VÀ BẢN IN ĐỒ HỌA A4 (.PDF) --- */
  const getUnicodeStatusBadge = (item) => {
    if (item.status === 'pass') return '✔ [ĐẠT CHUẨN]';
    if (item.levelLabel === 'Khá') return '◐ [MỨC KHÁ]  ';
    if (item.status === 'warn') return '⚠ [CẢNH BÁO] ';
    return '✖ [CHƯA ĐẠT] ';
  };

  const buildPlainTextReport = (record) => {
    if (!record) return '';
    const { url, timestamp, sourceLabel, evaluation, aiResult } = record;
    const theme = getScoreTheme(evaluation.totalScore);
    const aiHeaderLabel = aiResult && aiResult.isMock === false
      ? 'Phân tích chuyên sâu bởi JyabinAI'
      : 'Bản demo vòng loại - Dữ liệu mô phỏng AI';

    const lines = [
      `╔══════════════════════════════════════════════════════════════════════╗`,
      `║     BÁO CÁO ĐÁNH GIÁ & KIỂM TOÁN HIỆU SUẤT MARKETING WEBSITE         ║`,
      `║               JyabinAI (Vibe-coding - Đề 5) Audit Suite              ║`,
      `╚══════════════════════════════════════════════════════════════════════╝`,
      ``,
      `  • Website kiểm toán : ${url}`,
      `  • Phương thức quét  : ${sourceLabel}`,
      `  • Thời gian lập     : ${timestamp}`,
      `  • TỔNG ĐIỂM         : ${evaluation.totalScore}/100 ĐIỂM  ──►  XẾP HẠNG: ${theme.label.toUpperCase()}`,
      `  • Tổng quan 12 mục  : ✔ ${evaluation.counts.pass} Đạt chuẩn  |  ◐/⚠ ${evaluation.counts.warn} Khá & Cảnh báo  |  ✖ ${evaluation.counts.fail} Chưa đạt`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  PHẦN 1. ĐIỂM THÀNH PHẦN THEO 04 TRỤ CỘT MARKETING CỐT LÕI`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  [1] Hiển thị Tìm kiếm Google (SEO On-page)     : ${evaluation.pillars.seo.score}/${evaluation.pillars.seo.maxScore} điểm (${evaluation.pillars.seo.percentage}%)`,
      `  [2] Thu hút Mạng xã hội & Thương hiệu (Social) : ${evaluation.pillars.social.score}/${evaluation.pillars.social.maxScore} điểm (${evaluation.pillars.social.percentage}%)`,
      `  [3] Trải nghiệm Di động & Tốc độ (Mobile UX)   : ${evaluation.pillars.mobile.score}/${evaluation.pillars.mobile.maxScore} điểm (${evaluation.pillars.mobile.percentage}%)`,
      `  [4] Chuyển đổi Khách hàng & Đo lường (CTA)     : ${evaluation.pillars.conversion.score}/${evaluation.pillars.conversion.maxScore} điểm (${evaluation.pillars.conversion.percentage}%)`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  PHẦN 2. PHÂN TÍCH & TƯ VẤN TĂNG TRƯỞNG TỪ TRỢ LÝ JYABINAI`,
      `  (${aiHeaderLabel})`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `  ★ ${theme.strengthsHeading.toUpperCase()}:`,
      ...(aiResult?.strengths || []).map((s, idx) =>
        `    ${idx + 1}. ${s.title}\n       └─ Phân tích: ${s.detail}\n       └─ Ghi nhận : [${s.quote}]`
      ),
      ``,
      `  ⚡ ${theme.improvementsHeading.toUpperCase()}:`,
      ...(aiResult?.improvements || []).map((imp, idx) =>
        `    ${idx + 1}. ${imp.title}\n       └─ Giải pháp: ${imp.detail}\n       └─ Hiện trạng: [${imp.quote}]`
      ),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  PHẦN 3. CỤM MÃ HTML <HEAD> VÁ LỖI TỰ ĐỘNG CHO WEBSITE`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      evaluation.masterHeadPatch,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `  PHẦN 4. CHECKLIST KIỂM TOÁN CHI TIẾT 12 HẠNG MỤC`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``
    ];

    evaluation.items.forEach((item) => {
      lines.push(`  #${String(item.id).padStart(2, '0')} ${getUnicodeStatusBadge(item)} ${item.title}  (${item.score}/${item.maxScore}đ)`);
      lines.push(`      • Hiện trạng quét được : ${item.detectedTag}`);
      lines.push(`      • Tư vấn khắc phục     : ${item.recommendation}`);
      if (item.aiSuggestedCode) {
        lines.push(`      • ✨ Mã mẫu gợi ý từ JyabinAI : ${item.aiSuggestedCode.replace(/\n/g, '  |  ')}`);
      }
      lines.push(``);
    });

    lines.push(`════════════════════════════════════════════════════════════════════════`);
    lines.push(`  Xuất tự động bởi JyabinAI (Vibe-coding - Đề 5) — Marketing Audit Suite`);
    lines.push(`════════════════════════════════════════════════════════════════════════`);
    return lines.join('\n');
  };

  const getSafeFilenameSlug = (url) => {
    try {
      return new URL(url).hostname.replace(/[^a-z0-9.\-]/gi, '-');
    } catch {
      return 'website-sme';
    }
  };

  const buildReportHtmlMarkup = (record) => {
    const { url, timestamp, sourceLabel, evaluation, aiResult } = record;
    const theme = getScoreTheme(evaluation.totalScore);
    const aiHeaderLabel = aiResult && aiResult.isMock === false
      ? '✨ Phân tích chuyên sâu bởi JyabinAI'
      : 'Bản demo vòng loại - Dữ liệu mô phỏng AI';

    const rowsChecklistHtml = evaluation.items.map((item, idx) => {
      const bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const badgeBg = item.status === 'pass' ? '#dcfce7' : item.levelLabel === 'Khá' ? '#dbeafe' : item.status === 'warn' ? '#fef3c7' : '#ffe4e6';
      const badgeColor = item.status === 'pass' ? '#166534' : item.levelLabel === 'Khá' ? '#1e40af' : item.status === 'warn' ? '#92400e' : '#9f1239';

      return `
        <tr style="background-color: ${bgRow};">
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #475569;">#${item.id}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${escapeHtml(item.title)}</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">
            <div style="background-color: ${badgeBg}; color: ${badgeColor}; font-weight: bold; padding: 3px 6px; border-radius: 6px; font-size: 9pt;">
              ${escapeHtml(item.levelLabel)} (${item.score}/${item.maxScore}đ)
            </div>
          </td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 9.5pt; color: #334155;">
            <div><strong>• Hiện trạng:</strong> <span style="font-family: Consolas, monospace; color: #0f172a;">${escapeHtml(item.detectedTag)}</span></div>
            <div style="margin-top: 3px;"><strong>• Tư vấn tối ưu:</strong> ${escapeHtml(item.recommendation)}</div>
            ${item.aiSuggestedCode ? `<div style="margin-top: 4px; padding: 5px; background-color: #f5f3ff; border-left: 3px solid #7c3aed; color: #4c1d95; font-family: Consolas, monospace; font-size: 9pt;"><strong>✨ Mã mẫu gợi ý từ JyabinAI:</strong><br/>${escapeHtml(item.aiSuggestedCode)}</div>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div style="background-color: #ffffff; color: #1e293b; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5;">
        <table style="width: 100%; border-collapse: collapse; background-color: #312e81; color: #ffffff; border-radius: 8px; margin-bottom: 16px;">
          <tr>
            <td style="padding: 18px 22px;">
              <div style="font-size: 9.5pt; text-transform: uppercase; letter-spacing: 1px; color: #c7d2fe; font-weight: bold;">
                JYABINAI (VIBE-CODING - ĐỀ 5) — MARKETING AUDIT SUITE
              </div>
              <h1 style="font-size: 18pt; margin: 5px 0 6px 0; color: #ffffff;">
                BÁO CÁO ĐÁNH GIÁ &amp; KIỂM TOÁN MARKETING WEBSITE
              </h1>
              <div style="font-size: 10pt; color: #e0e7ff;">
                <strong>Website:</strong> ${escapeHtml(url)} &nbsp;|&nbsp; <strong>Phương thức:</strong> ${escapeHtml(sourceLabel)} &nbsp;|&nbsp; <strong>Ngày lập:</strong> ${escapeHtml(timestamp)}
              </div>
            </td>
            <td style="padding: 18px 22px; text-align: center; width: 165px; background-color: #1e1b4b; border-left: 2px solid #4338ca;">
              <div style="font-size: 28pt; font-weight: bold; color: ${theme.hex}; line-height: 1.1;">${evaluation.totalScore}/100</div>
              <div style="font-size: 9pt; font-weight: bold; color: #ffffff; margin-top: 5px; text-transform: uppercase;">${escapeHtml(theme.label)}</div>
            </td>
          </tr>
        </table>

        <h2 style="font-size: 12.5pt; color: #1e1b4b; border-bottom: 2px solid #4f46e5; padding-bottom: 4px; margin-top: 8px;">
          1. Điểm Hiệu Suất Theo 04 Trụ Cột Marketing Cốt Lõi
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0 16px 0;">
          <tr>
            <td style="width: 25%; padding: 10px; border: 1px solid #bfdbfe; background-color: #eff6ff; text-align: center;">
              <div style="font-size: 9pt; font-weight: bold; color: #1e40af;">1. TÌM KIẾM GOOGLE (SEO)</div>
              <div style="font-size: 16pt; font-weight: bold; color: #2563eb; margin: 3px 0;">${evaluation.pillars.seo.score}/${evaluation.pillars.seo.maxScore}đ</div>
              <div style="font-size: 8.5pt; color: #475569;">Đạt ${evaluation.pillars.seo.percentage}%</div>
            </td>
            <td style="width: 25%; padding: 10px; border: 1px solid #e9d5ff; background-color: #faf5ff; text-align: center;">
              <div style="font-size: 9pt; font-weight: bold; color: #6b21a8;">2. MẠNG XÃ HỘI &amp; BRAND</div>
              <div style="font-size: 16pt; font-weight: bold; color: #9333ea; margin: 3px 0;">${evaluation.pillars.social.score}/${evaluation.pillars.social.maxScore}đ</div>
              <div style="font-size: 8.5pt; color: #475569;">Đạt ${evaluation.pillars.social.percentage}%</div>
            </td>
            <td style="width: 25%; padding: 10px; border: 1px solid #a7f3d0; background-color: #ecfdf5; text-align: center;">
              <div style="font-size: 9pt; font-weight: bold; color: #065f46;">3. TRẢI NGHIỆM DI ĐỘNG</div>
              <div style="font-size: 16pt; font-weight: bold; color: #059669; margin: 3px 0;">${evaluation.pillars.mobile.score}/${evaluation.pillars.mobile.maxScore}đ</div>
              <div style="font-size: 8.5pt; color: #475569;">Đạt ${evaluation.pillars.mobile.percentage}%</div>
            </td>
            <td style="width: 25%; padding: 10px; border: 1px solid #fde68a; background-color: #fffbeb; text-align: center;">
              <div style="font-size: 9pt; font-weight: bold; color: #92400e;">4. CHUYỂN ĐỔI &amp; ĐO LƯỜNG</div>
              <div style="font-size: 16pt; font-weight: bold; color: #d97706; margin: 3px 0;">${evaluation.pillars.conversion.score}/${evaluation.pillars.conversion.maxScore}đ</div>
              <div style="font-size: 8.5pt; color: #475569;">Đạt ${evaluation.pillars.conversion.percentage}%</div>
            </td>
          </tr>
        </table>

        <h2 style="font-size: 12.5pt; color: #1e1b4b; border-bottom: 2px solid #4f46e5; padding-bottom: 4px;">
          2. Nhận Xét &amp; Tư Vấn Tăng Trưởng Từ Trợ Lý JyabinAI (${escapeHtml(aiHeaderLabel)})
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0 16px 0;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #bbf7d0; background-color: #f0fdf4;">
              <h3 style="margin: 0 0 8px 0; font-size: 11pt; color: #166534;">★ ${escapeHtml(theme.strengthsHeading)}</h3>
              <ol style="margin: 0; padding-left: 18px; font-size: 9.5pt; color: #1e293b;">
                ${(aiResult?.strengths || []).map(s => `
                  <li style="margin-bottom: 8px;">
                    <strong style="color: #065f46;">${escapeHtml(s.title)}:</strong> ${escapeHtml(s.detail)}
                    <div style="font-size: 8.5pt; color: #047857; font-weight: bold;">[${escapeHtml(s.quote)}]</div>
                  </li>
                `).join('')}
              </ol>
            </td>
            <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #fecaca; background-color: #fef2f2;">
              <h3 style="margin: 0 0 8px 0; font-size: 11pt; color: #991b1b;">⚡ ${escapeHtml(theme.improvementsHeading)}</h3>
              <ol style="margin: 0; padding-left: 18px; font-size: 9.5pt; color: #1e293b;">
                ${(aiResult?.improvements || []).map(i => `
                  <li style="margin-bottom: 8px;">
                    <strong style="color: #991b1b;">${escapeHtml(i.title)}:</strong> ${escapeHtml(i.detail)}
                    <div style="font-size: 8.5pt; color: #b91c1c; font-weight: bold;">[${escapeHtml(i.quote)}]</div>
                  </li>
                `).join('')}
              </ol>
            </td>
          </tr>
        </table>

        <h2 style="font-size: 12.5pt; color: #1e1b4b; border-bottom: 2px solid #4f46e5; padding-bottom: 4px;">
          3. Cụm Mã HTML &lt;head&gt; Vá Lỗi Tự Động (Copy Dán Vào Website)
        </h2>
        <pre style="padding: 10px; background-color: #f8fafc; border: 1px solid #cbd5e1; font-family: Consolas, monospace; font-size: 8.5pt; color: #1e1b4b; white-space: pre-wrap; word-break: break-all; margin: 8px 0 16px 0;">${escapeHtml(evaluation.masterHeadPatch)}</pre>

        <h2 style="font-size: 12.5pt; color: #1e1b4b; border-bottom: 2px solid #4f46e5; padding-bottom: 4px;">
          4. Bảng Checklist Kiểm Toán Chi Tiết 12 Hạng Mục
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #312e81; color: #ffffff; font-size: 9.5pt;">
              <th style="padding: 8px; border: 1px solid #312e81; width: 40px;">STT</th>
              <th style="padding: 8px; border: 1px solid #312e81; width: 195px; text-align: left;">Hạng mục kiểm toán</th>
              <th style="padding: 8px; border: 1px solid #312e81; width: 110px;">Mức đánh giá</th>
              <th style="padding: 8px; border: 1px solid #312e81; text-align: left;">Hiện trạng &amp; Hướng dẫn tối ưu</th>
            </tr>
          </thead>
          <tbody>
            ${rowsChecklistHtml}
          </tbody>
        </table>

        <div style="margin-top: 18px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8.5pt; color: #64748b; text-align: center;">
          <strong>JyabinAI (Vibe-coding - Đề 5)</strong> — Nền tảng Đánh giá &amp; Kiểm toán Hiệu suất Marketing Website cho Doanh nghiệp SME
        </div>
      </div>
    `;
  };

  const exportPdfReport = (record) => {
    if (!record) return;
    const printContainer = document.getElementById('jyabin-print-report');
    if (!printContainer) return;
    printContainer.innerHTML = buildReportHtmlMarkup(record);
    showToast('Đang mở hộp thoại Xuất PDF chuẩn A4...');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const downloadWordDocFile = (record) => {
    if (!record) return;
    const slug = getSafeFilenameSlug(record.url);
    const bodyMarkup = buildReportHtmlMarkup(record);
    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Báo Cáo JyabinAI - ${escapeHtml(record.url)}</title></head>
<body style="background-color:#ffffff;margin:0;padding:14px;">${bodyMarkup}</body></html>`;

    const blob = new Blob(['\uFEFF' + wordHtml], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao-Cao-JyabinAI-${slug}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast(`Đã tải xuống báo cáo Word: Bao-Cao-JyabinAI-${slug}.doc`);
  };

  /* --- RENDER MODAL CẨM NANG CHUẨN MARKETING SME --- */
  const renderSmeGuideModalContent = (record) => {
    if (!record) return;
    currentStudioKit = AIEngine.buildMarketingStudioKit(record.parsedData, record.evaluation);
    const { googleAd, socialPost, roadmap } = currentStudioKit;

    document.getElementById('smeGuideSubtitle').textContent =
      `Quy trình 03 bước tự tối ưu & mẫu quảng cáo thiết kế riêng cho ${record.url} (${record.evaluation.totalScore}/100đ)`;

    document.getElementById('aiStudioGoogleAdPreview').innerHTML = `
      <div class="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
        <span class="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[10px] font-extrabold">Được tài trợ</span>
        <span class="truncate text-slate-600">${escapeHtml(googleAd.displayUrl)}</span>
      </div>
      <div class="text-sm sm:text-base font-bold text-[#1a0dab] leading-snug pt-0.5">
        ${escapeHtml(googleAd.headline1)} | ${escapeHtml(googleAd.headline2)} | ${escapeHtml(googleAd.headline3)}
      </div>
      <p class="text-xs text-[#4d5156] leading-relaxed">
        ${escapeHtml(googleAd.desc1)} ${escapeHtml(googleAd.desc2)}
      </p>
    `;

    document.getElementById('aiStudioSocialPostPreview').textContent = socialPost;

    document.getElementById('aiStudioActionRoadmap').innerHTML = roadmap.map(step => `
      <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${step.badgeClass}">
          ${escapeHtml(step.phase)}
        </span>
        <h5 class="font-extrabold text-slate-900 text-xs sm:text-sm">${escapeHtml(step.title)}</h5>
        <ul class="space-y-1 text-slate-600 list-disc pl-4">
          ${step.tasks.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  };

  /* --- HIỂN THỊ GIAO DIỆN DASHBOARD --- */
  const renderLeftColumnScoreAndDiagnostics = (record, previousScoreForSameUrl) => {
    const { evaluation } = record;
    const score = evaluation.totalScore;
    const theme = getScoreTheme(score);

    const circumference = 2 * Math.PI * 66;
    const offset = circumference - (score / 100) * circumference;
    const arc = document.getElementById('scoreGaugeArc');
    arc.style.strokeDashoffset = String(offset);
    arc.style.stroke = theme.hex;

    animateScoreCountUp(score, 1100);

    const gradeBadge = document.getElementById('overallGradeBadge');
    gradeBadge.textContent = theme.label;
    gradeBadge.className = `px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${theme.bgBadge}`;

    const deltaEl = document.getElementById('historyDeltaBadge');
    if (typeof previousScoreForSameUrl === 'number') {
      const diff = score - previousScoreForSameUrl;
      if (diff > 0) {
        deltaEl.className = 'mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300';
        deltaEl.textContent = `▲ +${diff} điểm so với lần kiểm tra trước (${previousScoreForSameUrl}đ)`;
      } else if (diff < 0) {
        deltaEl.className = 'mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300';
        deltaEl.textContent = `▼ ${diff} điểm so với lần kiểm tra trước (${previousScoreForSameUrl}đ)`;
      } else {
        deltaEl.className = 'mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200';
        deltaEl.textContent = `● Giữ nguyên mức ${score}/100đ so với lần kiểm tra trước`;
      }
    } else {
      deltaEl.className = 'mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200';
      deltaEl.textContent = '● Lần kiểm toán đầu tiên của tên miền này';
    }

    document.getElementById('kpiBoxPass').textContent = String(evaluation.counts.pass);
    document.getElementById('kpiBoxWarn').textContent = String(evaluation.counts.warn);
    document.getElementById('kpiBoxFail').textContent = String(evaluation.counts.fail);

    const seoPct = evaluation.pillars.seo.percentage;
    const socialPct = evaluation.pillars.social.percentage;
    const convPct = Math.round(((evaluation.pillars.mobile.score + evaluation.pillars.conversion.score) / 40) * 100);

    const buildReadinessRow = (name, pct) => {
      const statusText = pct >= 80 ? 'Sẵn sàng chạy Ads' : pct >= 55 ? 'Cần tối ưu thêm' : 'Nguy cơ lỗ ngân sách';
      const badgeCls = pct >= 80
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
        : pct >= 55
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-rose-100 text-rose-800 border-rose-300';
      return `
        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200/80">
          <span class="font-semibold text-slate-700">${escapeHtml(name)}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold border ${badgeCls}">${statusText} (${pct}%)</span>
        </div>
      `;
    };

    document.getElementById('adReadinessContainer').innerHTML = [
      buildReadinessRow('Google Search & Shopping Ads', seoPct),
      buildReadinessRow('Facebook / Zalo Ads', socialPct),
      buildReadinessRow('Năng lực Chốt đơn (Mobile CRO)', convPct)
    ].join('');

    const pillarsContainer = document.getElementById('pillarsProgressContainer');
    pillarsContainer.innerHTML = ['seo', 'social', 'mobile', 'conversion'].map(key => {
      const p = evaluation.pillars[key];
      return `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-800 flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-md ${p.badgeBg} flex items-center justify-center shrink-0">
                <i data-lucide="${p.icon}" class="w-3 h-3"></i>
              </span>
              <span>${escapeHtml(p.shortName)}</span>
            </span>
            <span class="font-mono font-extrabold text-slate-900">
              ${p.score}/${p.maxScore}đ <span class="text-slate-400 font-normal">(${p.percentage}%)</span>
            </span>
          </div>
          <div class="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/70">
            <div class="h-full rounded-full transition-all duration-1000 ${p.barColor}" style="width: ${p.percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');
  };

  const renderLivePreviews = (d) => {
    let hostname = 'trang-web.vn';
    try { hostname = new URL(d.contextUrl).hostname; } catch { hostname = d.contextUrl; }

    document.getElementById('serpSiteName').textContent = hostname;
    document.getElementById('serpBreadcrumb').textContent = d.contextUrl;

    const favImg = document.getElementById('serpFaviconImg');
    const favFallback = document.getElementById('serpFaviconFallback');
    if (d.faviconResolved) {
      favImg.src = d.faviconResolved;
      favImg.classList.remove('hidden');
      favFallback.classList.add('hidden');
      favImg.onerror = () => {
        favImg.classList.add('hidden');
        favFallback.classList.remove('hidden');
      };
    } else {
      favImg.classList.add('hidden');
      favFallback.classList.remove('hidden');
    }

    const serpTitleEl = document.getElementById('serpTitle');
    serpTitleEl.textContent = d.titleText
      ? (d.titleText.length > 70 ? d.titleText.slice(0, 67) + '...' : d.titleText)
      : '[Chưa có thẻ <title>] — Trang web sẽ bị Google tự đặt tiêu đề ngẫu nhiên';
    serpTitleEl.className = d.titleText
      ? 'text-lg sm:text-[19px] font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug pt-1 break-words [overflow-wrap:anywhere]'
      : 'text-base sm:text-lg font-bold text-rose-600 leading-snug pt-1 break-words [overflow-wrap:anywhere]';

    const serpDescEl = document.getElementById('serpDescription');
    serpDescEl.textContent = d.metaDescText
      ? (d.metaDescText.length > 170 ? d.metaDescText.slice(0, 167) + '...' : d.metaDescText)
      : 'Trang web chưa có thẻ mô tả <meta name="description">. Hãy sao chép mã gợi ý ở Mục báo cáo 04 bên dưới để thu hút khách hàng trên Google.';
    serpDescEl.className = d.metaDescText
      ? 'text-xs sm:text-[13px] text-[#4d5156] leading-relaxed break-words [overflow-wrap:anywhere]'
      : 'text-xs sm:text-[13px] text-rose-600 italic leading-relaxed break-words [overflow-wrap:anywhere]';

    document.getElementById('serpTitleCounter').innerHTML = `Độ dài Tiêu đề: <strong>${d.titleLength}</strong>/70 ký tự`;
    document.getElementById('serpDescCounter').innerHTML = `Độ dài Mô tả: <strong>${d.metaDescLength}</strong>/170 ký tự`;

    const serpBadge = document.getElementById('serpStatusBadge');
    if (d.titleLength >= 25 && d.titleLength <= 70 && d.metaDescLength >= 50 && d.metaDescLength <= 170) {
      serpBadge.textContent = 'Chuẩn hiển thị Google';
      serpBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800';
    } else if (d.titleText && d.metaDescText) {
      serpBadge.textContent = 'Khá • Có thể tối ưu thêm';
      serpBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800';
    } else {
      serpBadge.textContent = 'Cần bổ sung mô tả SEO';
      serpBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800';
    }

    document.getElementById('socialDomain').textContent = hostname.toUpperCase();
    document.getElementById('socialTitle').textContent = d.ogTitle || d.titleText || 'Chưa có tiêu đề chia sẻ mạng xã hội';
    document.getElementById('socialDescription').textContent = d.ogDesc || d.metaDescText || 'Chưa có mô tả khi chia sẻ qua Zalo / Facebook.';

    const socialImg = document.getElementById('socialPreviewImg');
    const missingAlert = document.getElementById('socialMissingImageAlert');
    const socialBadge = document.getElementById('socialStatusBadge');

    if (d.ogImageResolved) {
      socialImg.src = d.ogImageResolved;
      socialImg.classList.remove('hidden');
      missingAlert.classList.add('hidden');
      socialImg.onerror = () => {
        socialImg.classList.add('hidden');
        missingAlert.classList.remove('hidden');
      };
    } else {
      socialImg.classList.add('hidden');
      missingAlert.classList.remove('hidden');
    }

    if (d.ogTitle && d.ogDesc && d.ogImageResolved) {
      socialBadge.textContent = 'Đầy đủ Open Graph';
      socialBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800';
    } else if (d.ogTitle || d.ogImageResolved) {
      socialBadge.textContent = 'Thiếu ảnh bìa hoặc mô tả';
      socialBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800';
    } else {
      socialBadge.textContent = 'Chưa cài đặt Open Graph';
      socialBadge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800';
    }
  };

  /**
   * Cập nhật chính xác nhãn AI ở Ảnh 2 dựa theo aiResult.isMock:
   * - Khi aiResult.isMock === false: Hiển thị nhãn xanh "🟢 ✨ Phân tích chuyên sâu bởi JyabinAI"
   * - Khi aiResult.isMock === true : Hiển thị nhãn vàng "🟡 Bản demo vòng loại - Dữ liệu mô phỏng AI"
   */
  const renderAiSection = (aiResult, totalScore = 78, isLoading = false) => {
    const skeleton = document.getElementById('aiLoadingSkeleton');
    const contentGrid = document.getElementById('aiContentGrid');
    const badge = document.getElementById('aiModeBadge');
    const errorBox = document.getElementById('aiErrorNotice');
    const errorText = document.getElementById('aiErrorNoticeText');
    const footerNote = document.getElementById('aiFooterNote');

    const theme = getScoreTheme(totalScore);
    document.getElementById('aiStrengthsHeading').textContent = theme.strengthsHeading;
    document.getElementById('aiImprovementsHeading').textContent = theme.improvementsHeading;

    if (isLoading) {
      document.getElementById('aiLoadingModelText').textContent =
        'JyabinAI đang phân tích sâu ngữ cảnh trang web...';
      skeleton.classList.remove('hidden');
      contentGrid.classList.add('hidden');
      errorBox.classList.add('hidden');
      return;
    }

    skeleton.classList.add('hidden');
    contentGrid.classList.remove('hidden');

    if (aiResult && aiResult.isMock === false) {
      badge.className = 'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-sm';
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span><span id="aiModeBadgeText">✨ Phân tích chuyên sâu bởi JyabinAI</span>`;
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300';
      badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span><span id="aiModeBadgeText">Bản demo vòng loại - Dữ liệu mô phỏng AI</span>`;
    }

    if (aiResult?.errorNotice) {
      errorText.textContent = aiResult.errorNotice;
      errorBox.classList.remove('hidden');
    } else {
      errorBox.classList.add('hidden');
    }

    footerNote.textContent = aiResult?.footerNote || 'Đã phân tích sâu ngữ cảnh trang chủ & danh mục dịch vụ bởi JyabinAI.';

    const buildCardHtml = (item, idx, isStrength) => {
      const numBg = isStrength ? 'bg-emerald-600' : 'bg-rose-600';
      const borderCol = isStrength ? 'border-emerald-200/80' : 'border-rose-200/80';
      const quoteStr = escapeHtml(truncateShort(item.quote || '', 42));
      return `
        <li style="animation-delay: ${idx * 90}ms" class="stagger-fade-up p-3.5 rounded-xl bg-white/95 border ${borderCol} shadow-sm min-w-0 overflow-hidden break-words [overflow-wrap:anywhere]">
          <div class="flex items-start gap-2.5 min-w-0">
            <span class="w-5 h-5 rounded-full ${numBg} text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">${idx + 1}</span>
            <div class="min-w-0 flex-1 space-y-1">
              <h5 class="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug break-words [overflow-wrap:anywhere]">
                ${escapeHtml(item.title || '')}
              </h5>
              <p class="text-xs text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere]">
                ${escapeHtml(item.detail || '')}
              </p>
              ${quoteStr ? `<span class="ai-quote-badge">${quoteStr}</span>` : ''}
            </div>
          </div>
        </li>
      `;
    };

    document.getElementById('aiStrengthsList').innerHTML =
      (aiResult?.strengths || []).map((item, idx) => buildCardHtml(item, idx, true)).join('');
    document.getElementById('aiImprovementsList').innerHTML =
      (aiResult?.improvements || []).map((item, idx) => buildCardHtml(item, idx, false)).join('');
  };

  const renderChecklist = (evaluation, filter = 'all') => {
    currentFilter = filter;

    document.getElementById('countFilterAll').textContent = evaluation.counts.all;
    document.getElementById('countFilterPass').textContent = evaluation.counts.pass;
    document.getElementById('countFilterWarn').textContent = evaluation.counts.warn;
    document.getElementById('countFilterFail').textContent = evaluation.counts.fail;

    document.querySelectorAll('.checklist-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-filter');
      btn.className = f === filter
        ? 'checklist-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold transition bg-white text-slate-900 shadow-sm'
        : 'checklist-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold transition text-slate-600 hover:bg-white/60';
    });

    const container = document.getElementById('checklistItemsContainer');
    const getStatusStyle = (item) => {
      if (item.status === 'pass') {
        return { badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'check-circle-2', iconColor: 'text-emerald-600' };
      }
      if (item.levelLabel === 'Khá') {
        return { badgeClass: 'bg-blue-100 text-blue-800 border-blue-300', icon: 'info', iconColor: 'text-blue-600' };
      }
      if (item.status === 'warn') {
        return { badgeClass: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'alert-triangle', iconColor: 'text-amber-500' };
      }
      return { badgeClass: 'bg-rose-100 text-rose-800 border-rose-300', icon: 'x-circle', iconColor: 'text-rose-600' };
    };

    const sectionsHtml = [];
    ['seo', 'social', 'mobile', 'conversion'].forEach(pKey => {
      const pInfo = evaluation.pillars[pKey];
      const filteredItems = evaluation.items.filter(item => {
        if (item.pillar !== pKey) return false;
        return filter === 'all' ? true : item.status === filter;
      });
      if (filteredItems.length === 0) return;

      const cardsHtml = filteredItems.map((item, idx) => {
        const st = getStatusStyle(item);
        const priorityBadgeHtml = item.score < item.maxScore
          ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${pInfo.priorityBadgeClass}">${escapeHtml(pInfo.priorityLabel)}</span>`
          : '';

        const suggestionHtml = item.aiSuggestedCode
          ? `
            <div class="ai-suggestion-box mt-2.5 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div class="min-w-0 flex-1 space-y-1">
                <span class="inline-flex items-center gap-1 text-[11px] font-extrabold text-purple-800">
                  <i data-lucide="sparkles" class="w-3.5 h-3.5 text-purple-600"></i>
                  ✨ Gợi ý mẫu tối ưu từ JyabinAI (Copy dùng ngay):
                </span>
                <pre class="font-mono text-[11px] text-indigo-950 bg-white/85 p-2 rounded-lg border border-purple-200 overflow-x-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere]">${escapeHtml(item.aiSuggestedCode)}</pre>
              </div>
              <button
                type="button"
                data-copy-suggestion="${escapeHtml(item.aiSuggestedCode)}"
                class="btn-copy-ai-code inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition shrink-0"
              >
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                <span>Copy mã mẫu</span>
              </button>
            </div>
          `
          : '';

        return `
          <div style="animation-delay: ${idx * 60}ms" class="stagger-fade-up p-4 rounded-xl border border-slate-200 bg-white shadow-sm min-w-0 overflow-hidden ${pInfo.cardBorderClass}">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
              <div class="flex items-start sm:items-center gap-2.5 min-w-0">
                <i data-lucide="${st.icon}" class="w-5 h-5 ${st.iconColor} shrink-0 mt-0.5 sm:mt-0"></i>
                <h5 class="font-bold text-slate-900 text-sm break-words [overflow-wrap:anywhere]">
                  <span class="text-slate-400 font-mono mr-1">#${item.id}</span>
                  ${escapeHtml(item.title)}
                </h5>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
                ${priorityBadgeHtml}
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${st.badgeClass}">
                  ${escapeHtml(item.levelLabel)}
                </span>
                <span class="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                  ${item.score}/${item.maxScore}đ
                </span>
              </div>
            </div>

            <div class="mt-3 pl-0 sm:pl-7 space-y-2 text-xs min-w-0">
              <div class="p-2.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] sm:text-xs break-words [overflow-wrap:anywhere]">
                <span class="text-slate-400 select-none">Hiện trạng quét được: </span>${escapeHtml(item.detectedTag)}
              </div>
              <p class="text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere]">
                <strong class="text-slate-800">Tư vấn tối ưu:</strong> ${escapeHtml(item.recommendation)}
              </p>
              ${suggestionHtml}
            </div>
          </div>
        `;
      }).join('');

      sectionsHtml.push(`
        <div class="space-y-3">
          <div class="flex items-center justify-between px-4 py-3 rounded-xl border ${pInfo.headerBg}">
            <h4 class="font-extrabold text-xs sm:text-sm flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg ${pInfo.badgeBg} flex items-center justify-center shrink-0">
                <i data-lucide="${pInfo.icon}" class="w-3.5 h-3.5"></i>
              </span>
              <span>${escapeHtml(pInfo.name)}</span>
            </h4>
            <span class="font-mono font-extrabold text-xs sm:text-sm px-2.5 py-1 rounded-lg bg-white/80 border border-current/10">
              ${pInfo.score}/${pInfo.maxScore} điểm (${pInfo.percentage}%)
            </span>
          </div>
          <div class="grid grid-cols-1 gap-3">
            ${cardsHtml}
          </div>
        </div>
      `);
    });

    container.innerHTML = sectionsHtml.length
      ? sectionsHtml.join('')
      : `<div class="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">Không có hạng mục nào ở bộ lọc này.</div>`;

    container.querySelectorAll('.btn-copy-ai-code').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-copy-suggestion') || '';
        copyTextToClipboard(code, 'Đã sao chép mã mẫu tối ưu từ JyabinAI!');
      });
    });

    refreshIcons();
  };

  const renderRubricBentoModal = () => {
    const container = document.getElementById('rubricTableBodyContainer');
    if (!container) return;

    const badgeColorMap = {
      emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      amber: 'bg-amber-100 text-amber-800 border-amber-300',
      rose: 'bg-rose-100 text-rose-800 border-rose-300'
    };

    const cardsHtml = RUBRIC_BENTO_CARDS.map(card => {
      const itemsHtml = card.criteria.map(c => {
        const tiersHtml = c.tiers.map(t => `
          <div class="flex items-start gap-2 text-[11px] leading-snug">
            <span class="px-2 py-0.5 rounded font-extrabold border shrink-0 ${badgeColorMap[t.color] || badgeColorMap.blue}">
              ${escapeHtml(t.label)}
            </span>
            <span class="text-slate-600 pt-0.5">${escapeHtml(t.desc)}</span>
          </div>
        `).join('');

        return `
          <div class="p-3 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-2">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <span class="font-extrabold text-slate-900 text-xs sm:text-sm">
                <span class="font-mono text-indigo-600 mr-1">${escapeHtml(c.id)}</span>${escapeHtml(c.name)}
              </span>
              <span class="px-2 py-0.5 rounded-md font-mono font-extrabold text-xs bg-slate-100 text-slate-800 shrink-0">
                Tối đa ${escapeHtml(c.weight)}
              </span>
            </div>
            <div class="space-y-1.5">
              ${tiersHtml}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="rounded-2xl border ${card.borderClass} ${card.bgLight} overflow-hidden shadow-sm flex flex-col">
          <div class="p-4 bg-gradient-to-r ${card.headerGradient} text-white flex items-center justify-between gap-2">
            <div>
              <h4 class="font-extrabold text-sm sm:text-base">${escapeHtml(card.title)}</h4>
              <p class="text-[11px] text-white/85 mt-0.5">${escapeHtml(card.subtitle)}</p>
            </div>
            <span class="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-sm font-mono font-extrabold text-xs sm:text-sm shrink-0">
              ${escapeHtml(card.totalWeight)}
            </span>
          </div>
          <div class="p-3.5 space-y-3 flex-1">
            ${itemsHtml}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${cardsHtml}</div>`;
  };

  const renderFullDashboard = (record, previousScoreForSameUrl) => {
    const { url, timestamp, sourceLabel, parsedData, evaluation, aiResult } = record;
    const theme = getScoreTheme(evaluation.totalScore);

    document.getElementById('auditSourceBadge').textContent = sourceLabel;
    document.getElementById('auditedUrlDisplay').textContent = url;
    document.getElementById('auditedTimeDisplay').textContent = timestamp;
    document.getElementById('auditedSummaryCounts').textContent =
      `${evaluation.counts.pass} Đạt chuẩn • ${evaluation.counts.warn} Khá/Cảnh báo • ${evaluation.counts.fail} Chưa đạt`;

    const visitBtn = document.getElementById('btnVisitTargetSite');
    if (/^https?:\/\//i.test(url)) {
      visitBtn.href = url;
      visitBtn.classList.remove('hidden');
    } else {
      visitBtn.classList.add('hidden');
    }

    document.getElementById('stickyBarDomain').textContent = url;
    const stickyScoreEl = document.getElementById('stickyBarScoreBadge');
    stickyScoreEl.textContent = `● ${evaluation.totalScore}/100 (${theme.label})`;
    stickyScoreEl.className = evaluation.totalScore >= 80
      ? 'inline-flex items-center gap-1 font-extrabold text-emerald-400 shrink-0'
      : evaluation.totalScore >= 55
        ? 'inline-flex items-center gap-1 font-extrabold text-amber-400 shrink-0'
        : 'inline-flex items-center gap-1 font-extrabold text-rose-400 shrink-0';

    document.getElementById('masterHeadPatchCode').textContent = evaluation.masterHeadPatch;
    document.getElementById('chatContextDomainLabel').textContent = `Đang tư vấn: ${url} (${evaluation.totalScore}/100đ)`;

    renderLeftColumnScoreAndDiagnostics(record, previousScoreForSameUrl);
    renderLivePreviews(parsedData);
    renderAiSection(aiResult, evaluation.totalScore, false);
    renderChecklist(evaluation, currentFilter);
    renderSmeGuideModalContent(record);
    refreshIcons();
  };

  const syncHistoryUI = () => {
    const list = AIEngine.getHistoryList();
    document.getElementById('historyCountBadge').textContent = String(list.length);
    const drawerContainer = document.getElementById('historyListContainer');
    const inlineGrid = document.getElementById('inlineHistoryGridContainer');

    if (list.length === 0) {
      const emptyMarkup = `
        <div class="col-span-full p-8 text-center text-slate-400 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
          <i data-lucide="inbox" class="w-10 h-10 mx-auto stroke-1"></i>
          <p class="text-sm font-semibold text-slate-600">Chưa có lịch sử kiểm toán</p>
          <p class="text-xs">Các báo cáo bạn đã quét sẽ được lưu tự động tại đây.</p>
        </div>
      `;
      drawerContainer.innerHTML = emptyMarkup;
      if (inlineGrid) inlineGrid.innerHTML = emptyMarkup;
      refreshIcons();
      return;
    }

    const buildHistoryItemHtml = (item) => {
      const theme = getScoreTheme(item.evaluation.totalScore);
      return `
        <div class="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-white shadow-sm transition group flex items-center justify-between gap-3">
          <button type="button" data-history-load="${escapeHtml(item.id)}" class="flex-1 text-left min-w-0">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold border ${theme.bgBadge}">
                ${item.evaluation.totalScore}/100đ
              </span>
              <span class="text-[11px] font-semibold text-slate-400 truncate">${escapeHtml(item.sourceLabel)}</span>
            </div>
            <p class="font-mono font-bold text-xs sm:text-sm text-slate-900 truncate mt-1 group-hover:text-indigo-600">
              ${escapeHtml(item.url)}
            </p>
            <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(item.timestamp)}</p>
          </button>
          <button
            type="button"
            data-history-delete="${escapeHtml(item.id)}"
            title="Xóa báo cáo này"
            class="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    };

    const htmlAll = list.map(buildHistoryItemHtml).join('');
    drawerContainer.innerHTML = htmlAll;
    if (inlineGrid) inlineGrid.innerHTML = htmlAll;

    const bindHistoryContainerEvents = (rootEl) => {
      if (!rootEl) return;
      rootEl.querySelectorAll('[data-history-load]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-history-load');
          const found = AIEngine.getHistoryList().find(x => x.id === id);
          if (found) {
            currentAuditRecord = found;
            renderFullDashboard(found, null);
            document.getElementById('drawerHistoryOverlay').classList.add('hidden');
            document.getElementById('scene-02')?.scrollIntoView({ behavior: 'smooth' });
            showToast(`Đã mở lại báo cáo: ${found.url}`);
          }
        });
      });

      rootEl.querySelectorAll('[data-history-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          AIEngine.deleteHistoryItem(btn.getAttribute('data-history-delete'));
          syncHistoryUI();
          showToast('Đã xóa mục lịch sử');
        });
      });
    };

    bindHistoryContainerEvents(drawerContainer);
    bindHistoryContainerEvents(inlineGrid);
    refreshIcons();
  };

  /* --- LUỒNG XỬ LÝ CHÍNH --- */
  const hideInputAlert = () => document.getElementById('inputAlertBox')?.classList.add('hidden');

  const showInputAlert = (title, message, showSwitchBtns = false) => {
    const box = document.getElementById('inputAlertBox');
    document.getElementById('inputAlertTitle').textContent = title;
    document.getElementById('inputAlertMessage').textContent = message;
    const actions = document.getElementById('inputAlertActions');
    if (showSwitchBtns) actions.classList.remove('hidden');
    else actions.classList.add('hidden');
    box.classList.remove('hidden');
  };

  const switchInputTab = (tabName) => {
    hideInputAlert();
    document.querySelectorAll('.input-tab-btn').forEach(btn => {
      const active = btn.getAttribute('data-tab') === tabName;
      btn.className = active
        ? 'input-tab-btn active-tab flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition bg-indigo-600 text-white shadow-sm'
        : 'input-tab-btn flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition text-slate-600 hover:text-slate-900';
    });
    document.querySelectorAll('.input-tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`tabPanel-${tabName}`)?.classList.remove('hidden');
  };

  const setScanStepActive = (stepNumber) => {
    [1, 2, 3, 4].forEach(num => {
      const el = document.getElementById(`scanStep${num}`);
      if (!el) return;
      if (num <= stepNumber) {
        el.className = 'scan-step-item flex items-center gap-2.5 p-3 rounded-xl border border-emerald-300 bg-emerald-50/80 text-emerald-950';
      } else {
        el.className = 'scan-step-item flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500';
      }
    });
  };

  const setLoadingState = (isLoading, title = '', subtitle = '', stepNum = 1) => {
    const loadingSec = document.getElementById('loadingSection');
    const dashboard = document.getElementById('dashboardContainer');
    if (isLoading) {
      if (title) document.getElementById('loadingTitle').textContent = title;
      if (subtitle) document.getElementById('loadingSubtitle').textContent = subtitle;
      setScanStepActive(stepNum);
      loadingSec.classList.remove('hidden');
      dashboard.classList.add('opacity-40', 'pointer-events-none');
    } else {
      loadingSec.classList.add('hidden');
      dashboard.classList.remove('opacity-40', 'pointer-events-none');
    }
  };

  const executeAuditFromHtml = async (rawHtml, initialUrl, sourceLabel) => {
    hideInputAlert();
    setLoadingState(true, 'Đang kiểm toán cấu trúc & chấm điểm Marketing...', 'Bước 2/4: Phân tích 12 tiêu chí thuộc 4 trụ cột...', 2);

    try {
      const parsedData = parseHtmlDocument(rawHtml, initialUrl);
      const evaluation = evaluate(parsedData);
      setScanStepActive(3);

      const existingHistory = AIEngine.getHistoryList();
      const prevMatch = existingHistory.find(item => item.url.replace(/\/$/, '') === parsedData.contextUrl.replace(/\/$/, ''));
      const previousScore = prevMatch ? prevMatch.evaluation.totalScore : null;

      const fallbackAi = AIEngine.generateMarketingFallbackInsights(parsedData, evaluation);
      setScanStepActive(4);

      const record = {
        id: 'audit_' + Date.now(),
        url: parsedData.contextUrl,
        timestamp: new Date().toLocaleString('vi-VN'),
        sourceLabel,
        parsedData,
        evaluation,
        aiResult: {
          isMock: true,
          badgeText: 'Bản demo vòng loại - Dữ liệu mô phỏng AI',
          footerNote: 'Đang đồng bộ nhận xét chuyên sâu từ JyabinAI...',
          errorNotice: null,
          ...fallbackAi
        }
      };

      currentAuditRecord = record;
      setLoadingState(false);
      renderFullDashboard(record, previousScore);
      initChatGreetingForRecord(record);

      renderAiSection(record.aiResult, evaluation.totalScore, true);
      const finalAi = await AIEngine.fetchGeminiAnalysis(parsedData, evaluation);
      record.aiResult = finalAi;
      currentAuditRecord = record;

      renderAiSection(finalAi, evaluation.totalScore, false);
      refreshIcons();

      AIEngine.saveAuditRecord(record);
      syncHistoryUI();
    } catch (err) {
      setLoadingState(false);
      showInputAlert('Không thể phân tích dữ liệu', err.message || 'Đã xảy ra lỗi khi đọc mã nguồn.');
    }
  };

  const handleUrlSubmit = async (e) => {
    if (e) e.preventDefault();
    const inputEl = document.getElementById('inputWebsiteUrl');
    const validation = normalizeAndValidateUrl(inputEl.value);

    if (!validation.valid) {
      showInputAlert(validation.errorTitle, validation.errorMessage, false);
      return;
    }

    inputEl.value = validation.normalizedUrl;
    hideInputAlert();
    setLoadingState(true, `Đang kết nối tới ${validation.hostname}...`, 'Bước 1/4: Đang tải mã nguồn trang web...', 1);

    try {
      const { html, sourceLabel } = await fetchHtmlWithMultiProxy(
        validation.normalizedUrl,
        (msg) => { document.getElementById('loadingSubtitle').textContent = msg; }
      );
      await executeAuditFromHtml(html, validation.normalizedUrl, sourceLabel);
      showToast(`Đã hoàn tất kiểm toán: ${validation.hostname}`);
    } catch (err) {
      setLoadingState(false);
      showInputAlert(
        'Website này đang bật tường lửa bảo mật chặn quét tự động',
        `${err.message} Bạn chỉ cần nhấn nút bên dưới để chuyển sang tab "Dán mã nguồn HTML" (có hướng dẫn 3 bước cực dễ) để chấm điểm chính xác 100%.`,
        true
      );
    }
  };

  const handleHtmlSubmit = async () => {
    const rawHtml = document.getElementById('inputRawHtml').value;
    const customDomain = (document.getElementById('inputHtmlContextUrl').value || '').trim();
    const validation = validateHtmlInput(rawHtml);

    if (!validation.valid) {
      showInputAlert(validation.errorTitle, validation.errorMessage, false);
      return;
    }

    await executeAuditFromHtml(validation.html, customDomain, 'Phân tích Mã HTML');
    showToast('Đã chấm điểm mã nguồn HTML thành công!');
  };

  const handleLoadSample = async (sampleId) => {
    const sample = getSampleById(sampleId);
    document.getElementById('inputWebsiteUrl').value = sample.url;
    await executeAuditFromHtml(sample.html, sample.url, sample.label);
    showToast(`Đã mở báo cáo: ${sample.url}`);
  };

  /* --- CỬA SỔ CHAT HỎI ĐÁP NGỮ CẢNH JYABINAI --- */
  const appendChatMessage = (sender, text) => {
    const list = document.getElementById('aiChatMessagesList');
    if (!list) return;
    const msgDiv = document.createElement('div');
    if (sender === 'user') {
      msgDiv.className = 'flex justify-end';
      msgDiv.innerHTML = `<div class="max-w-[85%] p-3 rounded-2xl rounded-tr-sm bg-indigo-600 text-white font-medium leading-relaxed break-words">${escapeHtml(text)}</div>`;
    } else {
      const formatted = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code class="font-mono bg-indigo-50 text-indigo-800 px-1 py-0.5 rounded">$1</code>')
        .replace(/\n/g, '<br/>');
      msgDiv.className = 'flex justify-start';
      msgDiv.innerHTML = `<div class="max-w-[92%] p-3 rounded-2xl rounded-tl-sm bg-white border border-slate-200 text-slate-800 leading-relaxed shadow-sm break-words">${formatted}</div>`;
    }
    list.appendChild(msgDiv);
    list.scrollTop = list.scrollHeight;
  };

  const initChatGreetingForRecord = (record) => {
    const list = document.getElementById('aiChatMessagesList');
    if (!list || !record) return;
    list.innerHTML = '';
    appendChatMessage(
      'ai',
      `Xin chào! Tôi là Cố vấn Chiến lược **JyabinAI**. Tôi đã đọc xong cấu trúc của **${record.url}** (Điểm hiện tại: **${record.evaluation.totalScore}/100đ**).\nBạn có thể bấm vào 3 gợi ý phía trên hoặc đặt bất kỳ câu hỏi nào về cách tối ưu SEO, chạy quảng cáo và tăng khách liên hệ cho website này!`
    );
  };

  const handleAskAiChat = async (questionText) => {
    const trimmed = (questionText || '').trim();
    if (!trimmed || !currentAuditRecord) return;
    appendChatMessage('user', trimmed);
    appendChatMessage('ai', 'JyabinAI đang phân tích ngữ cảnh website để trả lời...');
    const list = document.getElementById('aiChatMessagesList');
    const loadingBubble = list.lastElementChild;

    const answer = await AIEngine.askContextualQuestion(trimmed, currentAuditRecord);
    if (loadingBubble) loadingBubble.remove();
    appendChatMessage('ai', answer);
  };

  const bindScrollSpyStepper = () => {
    const stepBtns = Array.from(document.querySelectorAll('.scene-step-btn'));
    const percentBadge = document.getElementById('scrollPercentBadge');
    const sceneIds = ['scene-01', 'scene-02', 'scene-03', 'scene-04', 'scene-05'];

    stepBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-scroll-target');
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const pct = Math.min(Math.max(Math.round((scrollTop / docHeight) * 100), 0), 100);
      if (percentBadge) percentBadge.textContent = `${pct}%`;

      let activeId = 'scene-01';
      sceneIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.42) {
            activeId = id;
          }
        }
      });

      stepBtns.forEach(btn => {
        const isCurrent = btn.getAttribute('data-scroll-target') === activeId;
        if (isCurrent) btn.classList.add('active-step');
        else btn.classList.remove('active-step');
      });
    }, { passive: true });
  };

  const init = async () => {
    refreshIcons();
    renderRubricBentoModal();
    syncHistoryUI();
    bindScrollSpyStepper();

    document.getElementById('btnBrandScrollTop').addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.querySelectorAll('.input-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchInputTab(btn.getAttribute('data-tab')));
    });

    document.getElementById('btnCloseAlert').addEventListener('click', hideInputAlert);
    document.getElementById('btnSwitchToHtmlTab').addEventListener('click', () => switchInputTab('html'));
    document.getElementById('btnSwitchToSampleTab').addEventListener('click', () => switchInputTab('sample'));

    document.getElementById('formUrlAudit').addEventListener('submit', handleUrlSubmit);
    document.getElementById('btnSubmitHtml').addEventListener('click', handleHtmlSubmit);

    document.querySelectorAll('.btn-load-sample').forEach(btn => {
      btn.addEventListener('click', () => handleLoadSample(btn.getAttribute('data-sample-id')));
    });

    document.querySelectorAll('.checklist-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!currentAuditRecord) return;
        renderChecklist(currentAuditRecord.evaluation, btn.getAttribute('data-filter'));
      });
    });

    document.getElementById('btnCopyMasterHeadPatch').addEventListener('click', () => {
      if (!currentAuditRecord) return;
      copyTextToClipboard(
        currentAuditRecord.evaluation.masterHeadPatch,
        'Đã sao chép Cụm mã <head> Vá lỗi Tự động!'
      );
    });

    document.getElementById('btnRegenerateAi').addEventListener('click', async () => {
      if (!currentAuditRecord) return;
      renderAiSection(currentAuditRecord.aiResult, currentAuditRecord.evaluation.totalScore, true);
      const newAi = await AIEngine.fetchGeminiAnalysis(currentAuditRecord.parsedData, currentAuditRecord.evaluation);
      currentAuditRecord.aiResult = newAi;
      renderAiSection(newAi, currentAuditRecord.evaluation.totalScore, false);
      AIEngine.saveAuditRecord(currentAuditRecord);
      syncHistoryUI();
    });

    const triggerCopyFull = () => {
      if (!currentAuditRecord) return;
      copyTextToClipboard(buildPlainTextReport(currentAuditRecord), 'Đã sao chép toàn bộ Báo cáo vào Clipboard!');
    };
    document.getElementById('btnExportPdf').addEventListener('click', () => exportPdfReport(currentAuditRecord));
    document.getElementById('btnStickyPdf').addEventListener('click', () => exportPdfReport(currentAuditRecord));
    document.getElementById('btnDownloadDoc').addEventListener('click', () => downloadWordDocFile(currentAuditRecord));
    document.getElementById('btnStickyDoc').addEventListener('click', () => downloadWordDocFile(currentAuditRecord));
    document.getElementById('btnDownloadDocFromModal').addEventListener('click', () => downloadWordDocFile(currentAuditRecord));
    document.getElementById('btnCopyReport').addEventListener('click', triggerCopyFull);
    document.getElementById('btnStickyCopy').addEventListener('click', triggerCopyFull);
    document.getElementById('btnCopyFromModal').addEventListener('click', triggerCopyFull);

    // Modal Xem bản Text
    const modalReport = document.getElementById('modalReportPreview');
    document.getElementById('btnViewRawReportModal').addEventListener('click', () => {
      if (!currentAuditRecord) return;
      document.getElementById('textareaReportOutput').value = buildPlainTextReport(currentAuditRecord);
      modalReport.classList.remove('hidden');
      modalReport.classList.add('flex');
    });
    document.getElementById('btnCloseReportModal').addEventListener('click', () => {
      modalReport.classList.add('hidden');
      modalReport.classList.remove('flex');
    });

    // Modal Tiêu chí chấm điểm
    const modalRubric = document.getElementById('modalRubric');
    const closeRubric = () => { modalRubric.classList.add('hidden'); modalRubric.classList.remove('flex'); };
    document.getElementById('btnOpenRubricModal').addEventListener('click', () => {
      modalRubric.classList.remove('hidden');
      modalRubric.classList.add('flex');
    });
    document.getElementById('btnCloseRubricModal').addEventListener('click', closeRubric);
    document.getElementById('btnCloseRubricModalBottom').addEventListener('click', closeRubric);

    // Modal Cẩm nang Chuẩn Marketing SME (Quy trình 03 bước tự tối ưu)
    const modalSmeGuide = document.getElementById('modalSmeGuide');
    const openSmeGuide = () => {
      if (currentAuditRecord) renderSmeGuideModalContent(currentAuditRecord);
      modalSmeGuide.classList.remove('hidden');
      modalSmeGuide.classList.add('flex');
    };
    const closeSmeGuide = () => {
      modalSmeGuide.classList.add('hidden');
      modalSmeGuide.classList.remove('flex');
    };
    document.getElementById('btnOpenSmeGuideModal').addEventListener('click', openSmeGuide);
    document.getElementById('btnOpenSmeGuideFromCard').addEventListener('click', openSmeGuide);
    document.getElementById('btnCloseSmeGuideModal').addEventListener('click', closeSmeGuide);
    document.getElementById('btnCloseSmeGuideBottom').addEventListener('click', closeSmeGuide);

    document.getElementById('btnJumpToHeadPatchFromGuide').addEventListener('click', () => {
      closeSmeGuide();
      document.getElementById('scene-04')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btnCopyGoogleAdKit').addEventListener('click', () => {
      if (!currentStudioKit) return;
      const g = currentStudioKit.googleAd;
      const text = `Tiêu đề 1: ${g.headline1}\nTiêu đề 2: ${g.headline2}\nTiêu đề 3: ${g.headline3}\nMô tả 1: ${g.desc1}\nMô tả 2: ${g.desc2}`;
      copyTextToClipboard(text, 'Đã sao chép Mẫu Quảng cáo Google Search Ads!');
    });

    document.getElementById('btnCopySocialPostKit').addEventListener('click', () => {
      if (!currentStudioKit) return;
      copyTextToClipboard(currentStudioKit.socialPost, 'Đã sao chép Bài đăng Bán hàng Facebook/Zalo!');
    });

    // Cửa sổ Chat JyabinAI
    const chatWidget = document.getElementById('aiChatWidgetWindow');
    const openChatWidget = () => {
      chatWidget.classList.remove('hidden');
      chatWidget.classList.add('flex');
      document.getElementById('inputAiChatQuestion')?.focus();
    };
    const closeChatWidget = () => {
      chatWidget.classList.add('hidden');
      chatWidget.classList.remove('flex');
    };
    document.getElementById('btnToggleAiChatWidget').addEventListener('click', () => {
      if (chatWidget.classList.contains('hidden')) openChatWidget();
      else closeChatWidget();
    });
    document.getElementById('btnOpenAiChatFromCard').addEventListener('click', openChatWidget);
    document.getElementById('btnCloseAiChatWidget').addEventListener('click', closeChatWidget);

    document.querySelectorAll('.quick-ask-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        handleAskAiChat(chip.getAttribute('data-quick-ask'));
      });
    });

    document.getElementById('formAiChat').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('inputAiChatQuestion');
      const val = input.value;
      input.value = '';
      handleAskAiChat(val);
    });

    // Lịch sử Drawer & Nút xóa ở Mục 05
    const historyDrawer = document.getElementById('drawerHistoryOverlay');
    document.getElementById('btnToggleHistoryDrawer').addEventListener('click', () => {
      syncHistoryUI();
      historyDrawer.classList.remove('hidden');
    });
    document.getElementById('btnCloseHistoryDrawer').addEventListener('click', () => historyDrawer.classList.add('hidden'));
    document.getElementById('btnCloseHistoryBottom').addEventListener('click', () => historyDrawer.classList.add('hidden'));
    const clearHistoryAction = () => {
      AIEngine.clearAllHistory();
      syncHistoryUI();
      showToast('Đã xóa toàn bộ lịch sử kiểm toán');
    };
    document.getElementById('btnClearAllHistory').addEventListener('click', clearHistoryAction);
    document.getElementById('btnClearAllHistoryInline').addEventListener('click', clearHistoryAction);

    // Khởi động mặc định với Mẫu 1: Website SME Điển hình (https://bomcongnghiephn.com/ - 78/100đ)
    handleLoadSample('sme_bomhn');
  };

  document.addEventListener('DOMContentLoaded', init);
})();