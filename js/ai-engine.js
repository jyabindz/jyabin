/**
 * ============================================================================
 * FILE 3/4: js/ai-engine.js
 * Chứa:
 * - Cắm chặt API Key nội bộ mã hóa XOR (EMBEDDED_XOR_BYTES) và khóa hoàn toàn
 *   việc nhập API Key từ bên ngoài.
 * - Tự động dò tìm danh sách model thực tế qua GET /v1beta/models kết hợp mảng
 *   fallback ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview',
 *   'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'] để không bao giờ lỗi 404.
 * - Trả về cờ chuẩn isMock: false (Phân tích chuyên sâu bởi JyabinAI) hoặc isMock: true.
 * ============================================================================
 */
window.JyabinAI = window.JyabinAI || {};

window.JyabinAI.AIEngine = (() => {
  const { decodeKeyFromVault } = window.JyabinAI.ConfigSamples;
  const { truncateShort, buildRichAiPayload } = window.JyabinAI.ScannerScorer;

  /**
   * ==========================================================================
   * KHO KHÓA API NỘI BỘ MÃ HÓA XOR (DÁN MẢNG SỐ NGUYÊN CỦA BẠN VÀO ĐÂY):
   * ==========================================================================
   */
  const SALT = 47;
  const EMBEDDED_XOR_BYTES = [110,97,31,115,81,12,103,120,1,114,79,73,13,110,82,107,98,100,2,64,116,114,96,126,116,94,126,74,104,70,10,71,68,95,97,105,78,119,77,104,4,115,98,2,98,69,120,6,97,123,117,95,126];

  const encodeApiKeyToXorBytes = (rawKey) => {
    if (!rawKey || typeof rawKey !== 'string') return [];
    const trimmed = rawKey.trim();
    const bytes = [];
    for (let i = 0; i < trimmed.length; i++) {
      bytes.push(trimmed.charCodeAt(i) ^ (SALT + (i % 13)));
    }
    console.log('✅ Copy dòng dưới đây dán đè vào const EMBEDDED_XOR_BYTES trong js/ai-engine.js:');
    console.log(`const EMBEDDED_XOR_BYTES = ${JSON.stringify(bytes)};`);
    return bytes;
  };

  window.JyabinAI.encodeMyKey = encodeApiKeyToXorBytes;

  /**
   * Chỉ sử dụng duy nhất API Key được mã hóa nội bộ trong mã nguồn
   * (Tuyệt đối không nhận API Key bên ngoài từ localStorage hay URL)
   */
  const getInternalDecodedKey = () => {
    if (Array.isArray(EMBEDDED_XOR_BYTES) && EMBEDDED_XOR_BYTES.length > 10) {
      try {
        return EMBEDDED_XOR_BYTES
          .map((b, i) => String.fromCharCode(b ^ (SALT + (i % 13))))
          .join('')
          .trim();
      } catch {
        return '';
      }
    }
    const vaultKey = typeof decodeKeyFromVault === 'function' ? decodeKeyFromVault() : '';
    return vaultKey ? vaultKey.trim() : '';
  };

  // Bộ nhớ đệm danh sách model hợp lệ đã dò tìm được từ API
  let cachedValidModels = null;

  /**
   * Tự động gọi GET /v1beta/models để lấy đúng tên model mà Key nội bộ được phép gọi,
   * kết hợp với danh sách fallback chuẩn để đảm bảo không bao giờ bị lỗi 404
   */
  const resolveCandidateModels = async (apiKey) => {
    const fallbackChain = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest'
    ];

    if (Array.isArray(cachedValidModels) && cachedValidModels.length > 0) {
      return cachedValidModels;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) return fallbackChain;

      const data = await res.json();
      const rawModels = Array.isArray(data.models) ? data.models : [];

      const discovered = rawModels
        .filter(m => {
          const methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
          const name = (m.name || '').toLowerCase();
          return methods.includes('generateContent') &&
            name.includes('flash') &&
            !name.includes('tts') &&
            !name.includes('audio') &&
            !name.includes('image') &&
            !name.includes('vision');
        })
        .map(m => m.name.replace(/^models\//, ''));

      if (discovered.length > 0) {
        // Sắp xếp ưu tiên các bản flash mới nhất (3.5 -> 3 -> 2.5 -> 2.0 -> latest)
        discovered.sort((a, b) => {
          const score = (id) => {
            if (id.includes('3.5')) return 50;
            if (id.includes('3')) return 45;
            if (id.includes('2.5')) return 40;
            if (id.includes('2.0')) return 30;
            return 10;
          };
          return score(b) - score(a);
        });
        cachedValidModels = [...new Set([...discovered, ...fallbackChain])];
        return cachedValidModels;
      }
    } catch {
      clearTimeout(timer);
    }

    return fallbackChain;
  };

  /* --- QUẢN LÝ LƯU TRỮ LỊCH SỬ KIỂM TOÁN --- */
  const STORAGE_KEYS = {
    HISTORY: 'jyabin_v5_history'
  };

  const getHistoryList = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveAuditRecord = (record) => {
    try {
      const list = getHistoryList();
      const updated = [record, ...list.filter(item => item.id !== record.id)].slice(0, 25);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  };

  const deleteHistoryItem = (id) => {
    try {
      const list = getHistoryList().filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(list));
      return list;
    } catch {
      return [];
    }
  };

  const clearAllHistory = () => {
    try { localStorage.removeItem(STORAGE_KEYS.HISTORY); } catch (e) { console.error(e); }
    return [];
  };

  /* --- TẠO BỘ MẪU QUẢNG CÁO & CẨM NANG HÀNH ĐỘNG SME --- */
  const buildMarketingStudioKit = (d, evaluation) => {
    const topic = d.h1Texts[0] || d.h2Texts[0] || d.titleText.replace(/^(trang chủ|home)\s*[-|:]?\s*/i, '') || `Sản phẩm & Dịch vụ ${d.brandName}`;
    const cleanTopic = truncateShort(topic, 40);
    const servicesText = d.navItems.length > 0 ? d.navItems.slice(0, 4).join(' • ') : `${cleanTopic} chính hãng, bảo hành uy tín`;
    const contactPhone = d.quickContactLinks.find(l => l.startsWith('tel:'))?.replace(/^tel:/i, '') || d.detectedPlainPhone || 'Hotline trên web';

    const googleAd = {
      displayUrl: d.contextUrl,
      headline1: `${cleanTopic} Chính Hãng`,
      headline2: `Uy Tín Giá Tốt Tại ${d.brandName}`,
      headline3: `Báo Giá Nhanh • Bảo Hành Dài Hạn`,
      desc1: `${d.brandName} chuyên cung cấp ${cleanTopic}. Cam kết chất lượng chính hãng, giao hàng và lắp đặt tận nơi nhanh chóng.`,
      desc2: `Ưu đãi đặc biệt cho khách hàng liên hệ hôm nay (${servicesText}). Gọi ngay ${contactPhone} để nhận báo giá tốt nhất!`
    };

    const socialPost = [
      `🔥 GIẢI PHÁP ${cleanTopic.toUpperCase()} CHÍNH HÃNG - GIÁ TẬN KHO TẠI ${d.brandName.toUpperCase()}!`,
      ``,
      `Bạn đang tìm kiếm địa chỉ cung cấp ${cleanTopic} uy tín, đầy đủ chứng nhận chất lượng và chế độ hậu mãi chu đáo?`,
      `✅ Danh mục chủ lực: ${servicesText}`,
      `✅ Cam kết chính hãng 100% — Tư vấn kỹ thuật tận tâm 24/7`,
      `✅ Hỗ trợ báo giá nhanh và giao hàng tận nơi trên toàn quốc.`,
      ``,
      `👉 Xem chi tiết bảng giá tại: ${d.contextUrl}`,
      `📞 Liên hệ Hotline / Zalo tư vấn ngay: ${contactPhone}`
    ].join('\n');

    const failedAndWarn = evaluation.items.filter(i => i.score < i.maxScore);
    const step1Urgent = failedAndWarn.filter(i => i.pillar === 'conversion' || i.pillar === 'mobile').map(i => i.title);
    const step2Social = failedAndWarn.filter(i => i.pillar === 'social').map(i => i.title);
    const step3Seo = failedAndWarn.filter(i => i.pillar === 'seo').map(i => i.title);

    const roadmap = [
      {
        phase: 'Ưu tiên 1 (Trong 24h)',
        title: 'Chống thất thoát khách trên Di động & Chuyển đổi',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        tasks: step1Urgent.length > 0
          ? step1Urgent
          : ['Duy trì nút gọi Hotline/Zalo nổi trên di động', 'Kiểm tra tốc độ phản hồi khi khách gửi Form']
      },
      {
        phase: 'Ưu tiên 2 (Ngày 2 – 3)',
        title: 'Chuẩn hóa hình ảnh chia sẻ Zalo / Facebook & Ads',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        tasks: step2Social.length > 0
          ? step2Social
          : ['Cập nhật banner khuyến mãi mới cho thẻ og:image', 'Triển khai bài đăng bán hàng mẫu lên Fanpage/Zalo']
      },
      {
        phase: 'Ưu tiên 3 (Tuần đầu tiên)',
        title: 'Tối ưu SEO On-page lên Top Google bền vững',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        tasks: step3Seo.length > 0
          ? step3Seo
          : ['Mở rộng bài viết chuyên sâu cho các từ khóa dịch vụ', 'Theo dõi thứ hạng từ khóa trên Google Search Console']
      }
    ];

    return { googleAd, socialPost, roadmap };
  };

  /* --- BỘ TƯ VẤN MARKETING DỰ PHÒNG (SMART FALLBACK) --- */
  const generateMarketingFallbackInsights = (d, evaluation) => {
    const strengths = [];
    const improvements = [];
    const itemById = (id) => evaluation.items.find(i => i.id === id);

    if (itemById(8)?.score === 10) {
      strengths.push({
        title: 'Hiển thị tương thích tốt trên điện thoại di động',
        detail: 'Hơn 80% khách hàng hiện nay tìm kiếm sản phẩm bằng smartphone. Trang web của bạn đã tự động co giãn bố cục chuẩn xác, giúp khách xem thông tin mượt mà.',
        quote: 'Điểm tương thích di động: 10/10đ'
      });
    }
    if (itemById(11)?.score === 10) {
      strengths.push({
        title: 'Hệ thống liên hệ đa kênh chạm để gọi ngay lập tức',
        detail: 'Tích hợp sẵn các nút gọi Hotline, Zalo và Email trực tiếp giúp khách hàng kết nối với bộ phận bán hàng chỉ bằng 1 chạm, tăng mạnh tỷ lệ chốt đơn.',
        quote: `${d.quickContactLinks.length} điểm chạm liên hệ nhanh`
      });
    }
    if (itemById(2)?.score >= 7.5) {
      strengths.push({
        title: 'Lời dẫn chào hàng thuyết phục dưới kết quả Google',
        detail: 'Đoạn mô tả tóm tắt lợi ích dưới tiêu đề tìm kiếm đóng vai trò như một lời chào hàng ngắn gọn, thúc đẩy người xem bấm vào website.',
        quote: `Mô tả chuẩn (${d.metaDescLength} ký tự)`
      });
    }
    if (itemById(1)?.score >= 7.5) {
      strengths.push({
        title: 'Tiêu đề thương hiệu nổi bật trên kết quả tìm kiếm Google',
        detail: 'Tiêu đề trang được đặt rõ ràng kèm tên thương hiệu giúp tăng độ uy tín và thu hút khách hàng nhấp chuột khi so sánh với đối thủ.',
        quote: truncateShort(d.titleText, 40)
      });
    }
    if (itemById(6)?.score === 10) {
      strengths.push({
        title: 'Hình ảnh đại diện chuyên nghiệp khi chia sẻ Zalo, Facebook',
        detail: 'Khi nhân viên gửi link website cho khách qua Zalo hoặc chạy quảng cáo Facebook, bài viết luôn hiện khung ảnh lớn sắc nét, tạo ấn tượng uy tín.',
        quote: 'Đã tối ưu ảnh bìa og:image'
      });
    }
    if (itemById(12)?.score === 10) {
      strengths.push({
        title: 'Sẵn sàng phễu thu thập khách hàng & đo lường quảng cáo',
        detail: 'Biểu mẫu đăng ký và lời kêu gọi hành động rõ ràng giúp chuyển đổi người xem vãng lai thành khách hàng để lại số điện thoại tư vấn.',
        quote: 'Phễu chuyển đổi hoạt động tốt'
      });
    }
    if (itemById(7)?.score === 5 && strengths.length < 3) {
      strengths.push({
        title: 'Đã trang bị biểu tượng nhận diện thương hiệu (Favicon)',
        detail: 'Logo nhỏ hiển thị trên thanh tiêu đề trình duyệt và cạnh tên miền trên Google giúp website trông chỉn chu và đáng tin cậy hơn.',
        quote: 'Điểm nhận diện Favicon: 5/5đ'
      });
    }

    while (strengths.length < 3) {
      if (strengths.length === 0) {
        strengths.push({
          title: 'Đã có danh mục giới thiệu sản phẩm trên trang chủ',
          detail: 'Website đã bước đầu trình bày thông tin sản phẩm và hình ảnh thực tế, tạo nền tảng để nâng cấp thành kênh bán hàng tự động.',
          quote: `Có ${d.totalImages} hình ảnh nội dung`
        });
      } else if (strengths.length === 1) {
        strengths.push({
          title: 'Tốc độ phản hồi mã nguồn nhanh và nhẹ',
          detail: 'Cấu trúc trang gọn nhẹ giúp khách hàng mở trang nhanh chóng trên mạng di động, thuận lợi để bổ sung thêm các thẻ tối ưu Marketing.',
          quote: 'Cấu trúc HTML gọn nhẹ'
        });
      } else {
        strengths.push({
          title: 'Dư địa tăng trưởng lượng khách hàng tự nhiên rất lớn',
          detail: `Chỉ cần áp dụng cụm mã <head> vá lỗi tự động ở Mục báo cáo 04, điểm hiệu suất sẽ tăng thêm ${100 - evaluation.totalScore} điểm.`,
          quote: `Tiềm năng tăng +${100 - evaluation.totalScore} điểm`
        });
      }
    }

    if (itemById(1)?.score <= 4) {
      improvements.push({
        title: 'Thay đổi ngay tiêu đề mặc định "Trang chủ" để thu hút khách trên Google',
        detail: `Tiêu đề hiện tại ("${d.titleText || 'Trang chủ'}") chưa nêu bật sản phẩm chủ lực khiến khách tìm trên Google dễ lướt qua. Hãy copy mẫu tiêu đề chuẩn SEO ở Mục 04.`,
        quote: 'Tiêu đề đang để mặc định sơ sài'
      });
    }
    if (itemById(3)?.score <= 4) {
      improvements.push({
        title: 'Bổ sung thẻ tiêu đề chính (H1) khẳng định dịch vụ cốt lõi',
        detail: 'Website đang thiếu thẻ tiêu đề chính <h1> khiến bộ máy tìm kiếm Google khó xác định từ khóa trọng tâm để đẩy lên trang nhất.',
        quote: 'Cần bổ sung thẻ H1 chuẩn'
      });
    }
    if (itemById(6)?.score < 10) {
      improvements.push({
        title: 'Cài đặt ảnh bìa đại diện khi gửi link qua Zalo và Facebook',
        detail: 'Khi gửi link website cho khách qua Zalo hoặc đăng Facebook, bài viết đang bị trống khung ảnh đại diện lớn nhìn kém thu hút. Hãy gắn thêm thẻ ảnh og:image ở mục #6.',
        quote: 'Cảnh báo thiếu ảnh bìa og:image'
      });
    }
    if (itemById(8)?.score < 10) {
      improvements.push({
        title: 'Khắc phục lỗi chữ nhỏ li ti và vỡ giao diện trên điện thoại',
        detail: 'Trang web chưa có thẻ cấu hình hiển thị di động (viewport), khiến khách mở bằng điện thoại phải phóng to mới đọc được chữ và dễ thoát trang ngay lập tức.',
        quote: 'Thiếu cấu hình Mobile Viewport'
      });
    }
    if (itemById(2)?.score < 10) {
      improvements.push({
        title: 'Biên tập lại lời giới thiệu chào hàng dưới kết quả Google',
        detail: 'Đoạn mô tả tìm kiếm hiện đang thiếu hoặc quá ngắn. Hãy sử dụng mẫu mô tả chuẩn 50–170 ký tự đã được JyabinAI viết sẵn ở mục #2.',
        quote: itemById(2)?.score === 0 ? 'Thiếu mô tả meta description' : `Mô tả ngắn (${d.metaDescLength} ký tự)`
      });
    }
    if (itemById(11)?.score < 10) {
      improvements.push({
        title: 'Chuyển số điện thoại thành nút bấm gọi trực tiếp 1 chạm',
        detail: 'Hãy gắn liên kết bấm gọi (tel:) và nút Chat Zalo nổi trên góc màn hình để khách xem bằng điện thoại chạm là gọi mua hàng ngay.',
        quote: 'Tối ưu điểm chạm liên hệ'
      });
    }
    if (itemById(12)?.score < 10 && improvements.length < 3) {
      improvements.push({
        title: 'Bổ sung biểu mẫu nhận báo giá nhanh & công cụ đo lường quảng cáo',
        detail: 'Nên đặt biểu mẫu để khách hàng để lại số điện thoại nhận báo giá và cài đặt mã đo lường để theo dõi chuyển đổi.',
        quote: 'Cần nâng cấp phễu thu thập khách'
      });
    }

    while (improvements.length < 3) {
      if (improvements.length === 0) {
        improvements.push({
          title: 'Gắn đo lường chuyển đổi chi tiết cho từng nút gọi Hotline & Zalo',
          detail: 'Cấu hình sự kiện chuyển đổi (Conversion Event) khi khách bấm nút gọi để tối ưu ngân sách chạy quảng cáo.',
          quote: 'Tối ưu hiệu suất quảng cáo'
        });
      } else if (improvements.length === 1) {
        improvements.push({
          title: 'Bổ sung dữ liệu câu hỏi thường gặp (FAQ Schema) trên Google',
          detail: 'Giúp kết quả tìm kiếm của doanh nghiệp hiển thị kèm các câu giải đáp báo giá ngay trên trang nhất Google, chiếm diện tích gấp đôi đối thủ.',
          quote: 'Nâng cấp hiển thị Rich Snippets'
        });
      } else {
        improvements.push({
          title: 'Tối ưu chú thích alt cho toàn bộ hình ảnh sản phẩm',
          detail: 'Giúp hình ảnh sản phẩm thực tế của doanh nghiệp xuất hiện miễn phí trên tab Google Hình ảnh khi khách hàng tra cứu.',
          quote: `Đã tối ưu ${d.imagesWithAlt}/${d.totalImages} ảnh`
        });
      }
    }

    return {
      strengths: strengths.slice(0, 3),
      improvements: improvements.slice(0, 3)
    };
  };

  /* --- PHÂN TÍCH CHUYÊN SÂU BỞI JYABINAI ENGINE --- */
  const fetchGeminiAnalysis = async (parsedData, evaluation) => {
    const apiKey = getInternalDecodedKey();

    if (!apiKey) {
      return {
        isMock: true,
        engineName: 'JyabinAI Fallback',
        badgeText: 'Bản demo vòng loại - Dữ liệu mô phỏng AI',
        footerNote: 'Đã phân tích tự động theo chuẩn Marketing SME của JyabinAI.',
        errorNotice: null,
        ...generateMarketingFallbackInsights(parsedData, evaluation)
      };
    }

    const richPayload = buildRichAiPayload(parsedData, evaluation);
    const promptText = `Bạn là Giám đốc Marketing (CMO) kiêm Chuyên gia Kiểm toán Website của JyabinAI tư vấn cho Chủ doanh nghiệp SME tại Việt Nam.
Dưới đây là toàn bộ dữ liệu kiểm toán kỹ thuật VÀ ngữ cảnh nội dung thực tế của trang web (Menu dịch vụ, tiêu đề H1/H2/H3, nội dung bài viết chính và các điểm chạm liên hệ).

Hãy phân tích sâu sát đúng ngành nghề kinh doanh của website này và trả về đúng 03 Điểm mạnh ("strengths") và 03 Điểm cần cải thiện ("improvements") bằng tiếng Việt tự nhiên, thuyết phục.
Yêu cầu:
- Bám sát ngành hàng thực tế của website. Giải thích rõ tác động đến Doanh thu, Khách hàng, Quảng cáo Zalo/Facebook/Google và tỷ lệ chốt đơn.
- Mỗi mục gồm: "title" (tiêu đề ngắn dưới 12 từ), "detail" (phân tích & hướng dẫn khắc phục 2–3 câu dễ hiểu), "quote" (số liệu hoặc hiện trạng ngắn dưới 38 ký tự).

Dữ liệu Ngữ cảnh & Kiểm toán Website (JSON):
${JSON.stringify(richPayload, null, 2)}`;

    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            strengths: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  detail: { type: 'STRING' },
                  quote: { type: 'STRING' }
                },
                required: ['title', 'detail', 'quote']
              }
            },
            improvements: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  detail: { type: 'STRING' },
                  quote: { type: 'STRING' }
                },
                required: ['title', 'detail', 'quote']
              }
            }
          },
          required: ['strengths', 'improvements']
        }
      }
    };

    const candidateModels = await resolveCandidateModels(apiKey);

    for (const modelName of candidateModels) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 14000);
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        clearTimeout(timer);

        // Nếu model này bị 404 hoặc lỗi, tự động thử ngay model tiếp theo trong chuỗi
        if (!res.ok) continue;

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const parsedJson = JSON.parse(rawText);
        const fallback = generateMarketingFallbackInsights(parsedData, evaluation);

        const normalizeList = (arr, backupArr) => {
          if (!Array.isArray(arr) || arr.length === 0) return backupArr;
          const cleaned = arr.slice(0, 3).map((item, idx) => ({
            title: truncateShort(item?.title || backupArr[idx]?.title, 90),
            detail: String(item?.detail || backupArr[idx]?.detail || '').trim(),
            quote: truncateShort(item?.quote || backupArr[idx]?.quote, 42)
          }));
          while (cleaned.length < 3) cleaned.push(backupArr[cleaned.length]);
          return cleaned;
        };

        return {
          isMock: false,
          engineName: 'JyabinAI Engine',
          badgeText: '✨ Phân tích chuyên sâu bởi JyabinAI',
          footerNote: 'Đã phân tích sâu ngữ cảnh trang chủ, danh mục dịch vụ & phễu chuyển đổi bởi JyabinAI.',
          errorNotice: null,
          strengths: normalizeList(parsedJson.strengths, fallback.strengths),
          improvements: normalizeList(parsedJson.improvements, fallback.improvements)
        };
      } catch {
        clearTimeout(timer);
      }
    }

    // Chỉ khi mất mạng hoặc hết sạch quota ở tất cả các model mới rơi về Fallback
    const fallback = generateMarketingFallbackInsights(parsedData, evaluation);
    return {
      isMock: true,
      engineName: 'JyabinAI Fallback',
      badgeText: 'Bản demo vòng loại - Dữ liệu mô phỏng AI',
      footerNote: 'Đã tự động kích hoạt bộ Tư vấn Marketing dự phòng của JyabinAI.',
      errorNotice: null,
      ...fallback
    };
  };

  /* --- HỎI ĐÁP NGỮ CẢNH BỞI JYABINAI --- */
  const askContextualQuestion = async (question, auditRecord) => {
    const d = auditRecord.parsedData;
    const ev = auditRecord.evaluation;
    const topic = d.h1Texts[0] || d.h2Texts[0] || d.titleText || d.brandName;

    const generateSmartOfflineAnswer = (q) => {
      const lower = q.toLowerCase();
      if (lower.includes('title') || lower.includes('description') || lower.includes('tiêu đề')) {
        return `Dựa trên ngành hàng của **${d.brandName}** (${d.contextUrl}), JyabinAI đề xuất bộ thẻ chuẩn SEO thu hút khách nhấp chuột nhất:\n\n` +
          `• **Thẻ <title> (Chuẩn 55–65 ký tự):**\n\`${truncateShort(topic, 40)} Chính Hãng Giá Tốt | ${d.brandName}\`\n\n` +
          `• **Thẻ <meta description> (Chuẩn 140–155 ký tự):**\n\`${d.brandName} chuyên cung cấp ${truncateShort(topic, 45)} uy tín, đầy đủ bảo hành chính hãng, giao hàng tận nơi. Liên hệ ngay để nhận báo giá ưu đãi!\``;
      }
      if (lower.includes('gọi') || lower.includes('zalo') || lower.includes('chuyển đổi')) {
        return `Để tăng gấp đôi lượng khách liên hệ trên **${d.contextUrl}** (hiện đạt ${ev.pillars.conversion.score}/20đ Chuyển đổi), JyabinAI khuyến nghị:\n\n` +
          `1. **Gắn thanh nút nổi (Sticky Call/Zalo) ở góc dưới màn hình di động:** Khách lướt tới đâu cũng bấm gọi \`tel:\` hoặc mở \`zalo.me\` được ngay.\n` +
          `2. **Đặt biểu mẫu "Nhận báo giá trong 5 phút":** Chỉ yêu cầu 2 ô (Tên + Số điện thoại) ngay dưới danh mục sản phẩm chính.\n` +
          `3. **Thêm cam kết niềm tin cạnh nút gọi:** Ví dụ *"Tư vấn kỹ thuật miễn phí 24/7 - Báo giá tận xưởng"*.`;
      }
      if (lower.includes('từ khóa') || lower.includes('quảng cáo') || lower.includes('ads')) {
        const menuHints = d.navItems.slice(0, 4).join(', ') || topic;
        return `Chiến lược từ khóa Google Ads & nội dung Facebook Ads do JyabinAI thiết kế cho **${d.brandName}** (Dựa trên danh mục: *${menuHints}*):\n\n` +
          `• **05 Từ khóa mua hàng (High-Intent Keywords):**\n` +
          `  1. báo giá ${truncateShort(topic, 35)} chính hãng\n` +
          `  2. đại lý phân phối ${truncateShort(topic, 35)} uy tín\n` +
          `  3. mua ${truncateShort(d.navItems[0] || topic, 35)} giá sỉ\n` +
          `  4. lắp đặt ${truncateShort(d.navItems[1] || topic, 35)} tận nơi\n` +
          `  5. ${d.brandName.toLowerCase()} hotline tư vấn\n\n` +
          `• **Lưu ý trước khi chạy Ads:** Hãy cài đặt ảnh \`og:image\` và mã theo dõi chuyển đổi ở Mục báo cáo 04 để không lãng phí ngân sách.`;
      }
      return `Đối với website **${d.contextUrl}** (Tổng điểm hiện tại: **${ev.totalScore}/100đ**):\n` +
        `• Điểm mạnh nhất: Trụ cột Mobile (${ev.pillars.mobile.score}/20đ) & Chuyển đổi (${ev.pillars.conversion.score}/20đ).\n` +
        `• Việc cần làm ngay: Sao chép **Cụm mã <head> vá lỗi tự động** tại Mục báo cáo 04 dán vào website để hoàn thiện SEO (${ev.pillars.seo.score}/35đ) và hiển thị Zalo/Facebook (${ev.pillars.social.score}/25đ).`;
    };

    const apiKey = getInternalDecodedKey();
    if (!apiKey) {
      await new Promise(r => setTimeout(r, 350));
      return generateSmartOfflineAnswer(question);
    }

    const richContext = buildRichAiPayload(d, ev);
    const chatPrompt = `Bạn là Cố vấn Chiến lược Marketing của JyabinAI đang hỗ trợ trực tiếp cho chủ website ${d.contextUrl}.
Dữ liệu thực tế của website: ${JSON.stringify(richContext)}
Câu hỏi của chủ doanh nghiệp: "${question}"
Hãy trả lời ngắn gọn (dưới 160 từ), xưng là JyabinAI, trình bày gạch đầu dòng rõ ràng, thực tế, đưa ra ví dụ cụ thể sát ngành hàng của website này.`;

    const candidateModels = await resolveCandidateModels(apiKey);
    for (const modelName of candidateModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: chatPrompt }] }],
            generationConfig: { temperature: 0.35 }
          })
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch {
        // Thử model tiếp theo
      }
    }
    return generateSmartOfflineAnswer(question);
  };

  return {
    getHistoryList,
    saveAuditRecord,
    deleteHistoryItem,
    clearAllHistory,
    buildMarketingStudioKit,
    generateMarketingFallbackInsights,
    fetchGeminiAnalysis,
    askContextualQuestion
  };
})();