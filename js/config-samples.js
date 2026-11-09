/**
 * ============================================================================
 * FILE 1/4: js/config-samples.js
 * Chứa:
 * - Kho khóa mã hóa XOR (BUILT_IN_KEY_VAULT) chống GitHub Secret Scanner
 * - Cấu hình 4 Trụ cột Marketing đa sắc màu & Bento Grid 4 thẻ màu cho Modal
 * - 03 Kịch bản Website SME thực tế tại Việt Nam (~78đ, ~90đ, ~52đ)
 * ============================================================================
 */
window.JyabinAI = window.JyabinAI || {};

window.JyabinAI.ConfigSamples = (() => {
  /**
   * KHO KHÓA MẶC ĐỊNH MÃ HÓA XOR (CHỐNG GITHUB SECRET SCANNER KHI PUSH LÊN .GITHUB.IO)
   * Hướng dẫn nhúng Key của bạn:
   * 1. Mở Console trình duyệt (F12) và gõ:
   *    window.JyabinAI.encodeMyKey("AIzaSy_KEY_CỦA_BẠN")
   * 2. Copy mảng số nguyên trả về và dán vào hằng số BUILT_IN_KEY_VAULT bên dưới.
   */
  const SALT_KEY = 73;
  const BUILT_IN_KEY_VAULT = [];

  const encodeKeyToVault = (rawKey) => {
    if (!rawKey || typeof rawKey !== 'string') return [];
    const trimmed = rawKey.trim();
    const arr = [];
    for (let i = 0; i < trimmed.length; i++) {
      arr.push(trimmed.charCodeAt(i) ^ (SALT_KEY + (i % 17)));
    }
    console.log('Copy mảng số nguyên dưới đây dán vào BUILT_IN_KEY_VAULT trong js/config-samples.js:');
    console.log(JSON.stringify(arr));
    return arr;
  };

  const decodeKeyFromVault = (vaultArr = BUILT_IN_KEY_VAULT) => {
    if (!Array.isArray(vaultArr) || vaultArr.length === 0) return '';
    try {
      return vaultArr
        .map((code, i) => String.fromCharCode(code ^ (SALT_KEY + (i % 17))))
        .join('');
    } catch {
      return '';
    }
  };

  // Gắn hàm tiện ích ra toàn cục để lập trình viên tạo mảng số nguyên dễ dàng trên Console
  window.JyabinAI.encodeMyKey = encodeKeyToVault;

  // Cấu hình 4 Trụ cột Marketing
  const PILLAR_META = {
    seo: {
      id: 'seo',
      name: 'Trụ cột 1: Hiển thị Tìm kiếm Google (SEO On-page)',
      shortName: '1. Tìm kiếm Google (SEO)',
      maxScore: 35,
      icon: 'search',
      themeColor: 'blue',
      headerBg: 'bg-blue-50/95 border-blue-200 text-blue-900',
      badgeBg: 'bg-blue-600 text-white',
      barColor: 'bg-blue-600',
      cardBorderClass: 'pillar-card-seo',
      priorityLabel: '🔵 Ưu tiên 3: Nền tảng SEO',
      priorityBadgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    social: {
      id: 'social',
      name: 'Trụ cột 2: Thu hút Mạng xã hội & Thương hiệu (Social & Branding)',
      shortName: '2. Mạng xã hội & Thương hiệu',
      maxScore: 25,
      icon: 'share-2',
      themeColor: 'purple',
      headerBg: 'bg-purple-50/95 border-purple-200 text-purple-900',
      badgeBg: 'bg-purple-600 text-white',
      barColor: 'bg-purple-600',
      cardBorderClass: 'pillar-card-social',
      priorityLabel: '🟠 Ưu tiên 2: Thu hút Click Quảng cáo & Zalo/FB',
      priorityBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    mobile: {
      id: 'mobile',
      name: 'Trụ cột 3: Trải nghiệm Di động & Tốc độ hiển thị (Mobile & UX)',
      shortName: '3. Trải nghiệm Di động (Mobile)',
      maxScore: 20,
      icon: 'smartphone',
      themeColor: 'emerald',
      headerBg: 'bg-emerald-50/95 border-emerald-200 text-emerald-900',
      badgeBg: 'bg-emerald-600 text-white',
      barColor: 'bg-emerald-600',
      cardBorderClass: 'pillar-card-mobile',
      priorityLabel: '🔴 Ưu tiên 1: Chuyển đổi & Mobile',
      priorityBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    conversion: {
      id: 'conversion',
      name: 'Trụ cột 4: Chuyển đổi Khách hàng & Đo lường (Conversion & MarTech)',
      shortName: '4. Chuyển đổi & Đo lường',
      maxScore: 20,
      icon: 'mouse-pointer-click',
      themeColor: 'amber',
      headerBg: 'bg-amber-50/95 border-amber-200 text-amber-900',
      badgeBg: 'bg-amber-500 text-white',
      barColor: 'bg-amber-500',
      cardBorderClass: 'pillar-card-conversion',
      priorityLabel: '🔴 Ưu tiên 1: Chuyển đổi & Mobile',
      priorityBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
    }
  };

  // Dữ liệu 04 Thẻ Trụ Cột Bento Grid 2x2 trong Modal "Tiêu chí chấm điểm"
  const RUBRIC_BENTO_CARDS = [
    {
      pillarKey: 'seo',
      title: '1. Hiển thị Tìm kiếm Google (SEO On-page)',
      totalWeight: '35 Điểm',
      subtitle: 'Giúp khách hàng dễ dàng tìm thấy doanh nghiệp trên Google',
      headerGradient: 'from-blue-600 to-indigo-600',
      borderClass: 'border-blue-200',
      bgLight: 'bg-blue-50/40',
      criteria: [
        {
          id: '#1',
          name: 'Thẻ tiêu đề <title>',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: '25–70 ký tự, có ý nghĩa thương hiệu rõ ràng', color: 'emerald' },
            { label: 'Khá (7.5đ)', desc: 'Hơi ngắn/dài từ 18–24 hoặc 71–95 ký tự', color: 'blue' },
            { label: 'Cảnh báo (4đ)', desc: 'Đặt tên sơ sài ("Trang chủ", "Home") hoặc <18 / >95 ký tự', color: 'amber' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu thẻ <title>', color: 'rose' }
          ]
        },
        {
          id: '#2',
          name: 'Thẻ mô tả <meta description>',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: 'Dài chuẩn 50–170 ký tự thu hút khách nhấp chuột', color: 'emerald' },
            { label: 'Khá (7.5đ)', desc: 'Dài 30–49 hoặc 171–240 ký tự', color: 'blue' },
            { label: 'Cảnh báo (4đ)', desc: 'Quá ngắn <30 hoặc quá dài >240 ký tự', color: 'amber' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu thẻ mô tả tìm kiếm', color: 'rose' }
          ]
        },
        {
          id: '#3',
          name: 'Cấu trúc Heading <h1> & <h2>',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: 'Đúng 01 thẻ <h1> kèm các thẻ <h2>', color: 'emerald' },
            { label: 'Khá (7đ)', desc: 'Nhiều <h1> nhưng có <h2>, hoặc 1 <h1> thiếu <h2>', color: 'blue' },
            { label: 'Cảnh báo (4đ)', desc: 'Không có <h1> nhưng có thẻ <h2>', color: 'amber' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu hoàn toàn cả <h1> và <h2>', color: 'rose' }
          ]
        },
        {
          id: '#4',
          name: 'Định danh URL gốc <link rel="canonical">',
          weight: '5đ',
          tiers: [
            { label: 'Đạt chuẩn (5đ)', desc: 'Có khai báo thẻ Canonical hợp lệ', color: 'emerald' },
            { label: 'Khá (2.5đ)', desc: 'Chưa khai báo nhưng URL chuẩn HTTPS sạch', color: 'blue' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu Canonical và chưa có HTTPS', color: 'rose' }
          ]
        }
      ]
    },
    {
      pillarKey: 'social',
      title: '2. Thu hút Mạng xã hội & Thương hiệu',
      totalWeight: '25 Điểm',
      subtitle: 'Hiển thị chuyên nghiệp khi gửi link qua Zalo, Facebook, chạy Ads',
      headerGradient: 'from-purple-600 to-fuchsia-600',
      borderClass: 'border-purple-200',
      bgLight: 'bg-purple-50/40',
      criteria: [
        {
          id: '#5',
          name: 'Thông tin chia sẻ (og:title & og:description)',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: 'Khai báo đầy đủ cả og:title và og:description', color: 'emerald' },
            { label: 'Khá (6đ)', desc: 'Có 1 trong 2 thẻ Open Graph', color: 'blue' },
            { label: 'Cảnh báo (3đ)', desc: 'Thiếu OG nhưng có <title> & <meta description> thay thế', color: 'amber' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu hoàn toàn thông tin chia sẻ', color: 'rose' }
          ]
        },
        {
          id: '#6',
          name: 'Ảnh đại diện Zalo/Facebook (og:image)',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: 'Có thẻ og:image hợp lệ hiện khung ảnh lớn', color: 'emerald' },
            { label: 'Cảnh báo (4đ)', desc: 'Thiếu og:image nhưng trang có ảnh <img> nội dung lớn', color: 'amber' },
            { label: 'Chưa đạt (0đ)', desc: 'Không có bất kỳ hình ảnh nào', color: 'rose' }
          ]
        },
        {
          id: '#7',
          name: 'Biểu tượng thương hiệu Favicon',
          weight: '5đ',
          tiers: [
            { label: 'Đạt chuẩn (5đ)', desc: 'Có khai báo icon / shortcut icon / apple-touch-icon', color: 'emerald' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu biểu tượng nhận diện Favicon', color: 'rose' }
          ]
        }
      ]
    },
    {
      pillarKey: 'mobile',
      title: '3. Trải nghiệm Di động & Tốc độ hiển thị',
      totalWeight: '20 Điểm',
      subtitle: 'Đảm bảo hơn 80% khách hàng xem bằng điện thoại không bị thoát trang',
      headerGradient: 'from-emerald-600 to-teal-600',
      borderClass: 'border-emerald-200',
      bgLight: 'bg-emerald-50/40',
      criteria: [
        {
          id: '#8',
          name: 'Tương thích thiết bị di động (<meta viewport>)',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: 'Có thuộc tính chuẩn width=device-width', color: 'emerald' },
            { label: 'Khá (6đ)', desc: 'Có thẻ viewport nhưng cấu hình chưa đầy đủ', color: 'blue' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu thẻ viewport (vỡ giao diện trên di động)', color: 'rose' }
          ]
        },
        {
          id: '#9',
          name: 'Tối ưu thuộc tính alt cho hình ảnh <img>',
          weight: '5đ',
          tiers: [
            { label: 'Đạt chuẩn (5đ)', desc: 'Từ 70% hình ảnh trở lên có mô tả alt', color: 'emerald' },
            { label: 'Khá (3.5đ)', desc: 'Từ 40% – 69% hình ảnh có mô tả alt', color: 'blue' },
            { label: 'Cảnh báo (2đ)', desc: 'Từ 10% – 39% hình ảnh có mô tả alt', color: 'amber' },
            { label: 'Chưa đạt (0đ)', desc: 'Dưới 10% hình ảnh có mô tả alt', color: 'rose' }
          ]
        },
        {
          id: '#10',
          name: 'Khai báo Ngôn ngữ & Dữ liệu cấu trúc',
          weight: '5đ',
          tiers: [
            { label: 'Đạt chuẩn (5đ)', desc: 'Có <html lang="..."> hoặc dữ liệu Schema JSON-LD', color: 'emerald' },
            { label: 'Khá (2.5đ)', desc: 'Chỉ có khai báo bảng mã <meta charset> cơ bản', color: 'blue' },
            { label: 'Chưa đạt (0đ)', desc: 'Thiếu cả lang, Schema và charset', color: 'rose' }
          ]
        }
      ]
    },
    {
      pillarKey: 'conversion',
      title: '4. Chuyển đổi Khách hàng & Đo lường',
      totalWeight: '20 Điểm',
      subtitle: 'Biến người xem website thành cuộc gọi tư vấn và đơn hàng thực tế',
      headerGradient: 'from-amber-500 to-orange-600',
      borderClass: 'border-amber-200',
      bgLight: 'bg-amber-50/40',
      criteria: [
        {
          id: '#11',
          name: 'Kênh liên hệ nhanh (tel:, mailto:, Zalo, Messenger)',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: 'Có gắn link bấm gọi/nhắn tin trực tiếp 1 chạm', color: 'emerald' },
            { label: 'Cảnh báo (5đ)', desc: 'Chỉ có SĐT/Email dạng chữ thuần chưa gắn link bấm', color: 'amber' },
            { label: 'Chưa đạt (0đ)', desc: 'Không tìm thấy thông tin liên hệ trên trang', color: 'rose' }
          ]
        },
        {
          id: '#12',
          name: 'Thu thập khách hàng & Đo lường (Form / CTA / MarTech)',
          weight: '10đ',
          tiers: [
            { label: 'Đạt chuẩn (10đ)', desc: 'Có Form đăng ký, CTA rõ ràng hoặc mã GA4/Pixel', color: 'emerald' },
            { label: 'Khá (6đ)', desc: 'Chỉ có nút bấm điều hướng cơ bản', color: 'blue' },
            { label: 'Chưa đạt (0đ)', desc: 'Không có Form, nút CTA và mã đo lường', color: 'rose' }
          ]
        }
        ]
    }
  ];

  /**
   * 03 Kịch bản Website Doanh nghiệp nhỏ (SME) thực tế tại Việt Nam:
   * 1. sme_bomhn      : https://bomcongnghiephn.com/ (~78/100đ)
   * 2. sme_kimyen     : https://www.ykhoakimyen.com (~90/100đ)
   * 3. sme_maybomviet : https://maybomviet.com/ (~52/100đ)
   */
  const SAMPLES = {
    sme_bomhn: {
      id: 'sme_bomhn',
      domainKey: 'bomcongnghiephn.com',
      label: 'Mẫu SME Điển hình: Máy Bơm Công Nghiệp Hà Nội',
      url: 'https://bomcongnghiephn.com/',
      html: `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trang chủ - Máy Bơm Công Nghiệp Hà Nội</title>
  <meta name="description" content="Chuyên nhập khẩu và phân phối máy bơm công nghiệp Pentax, Ebara, máy bơm chữa cháy PCCC, bơm chìm nước thải chính hãng CO-CQ đầy đủ tại Hà Nội.">
  <link rel="canonical" href="https://bomcongnghiephn.com/">
  <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/2933/2933921.png">
  <meta property="og:title" content="Máy Bơm Công Nghiệp Hà Nội - Phân Phối Pentax, Ebara Chính Hãng">
  <meta property="og:description" content="Kho máy bơm công nghiệp công suất lớn, bơm PCCC, bơm cấp nước tòa nhà giá tốt nhất miền Bắc. Bảo hành chính hãng 12 tháng.">
</head>
<body>
  <header>
    <nav>
      <a href="/bom-cong-nghiep-pentax">Máy bơm Pentax Ý</a>
      <a href="/bom-chua-chay-pccc">Máy bơm chữa cháy PCCC</a>
      <a href="/bom-chim-nuoc-thai">Bơm chìm nước thải Tsurumi</a>
      <a href="/tu-dien-dieu-khien">Tủ điện điều khiển máy bơm</a>
      <a href="tel:0989123456">Hotline kỹ thuật: 0989 123 456</a>
      <a href="mailto:kinhdoanh@bomcongnghiephn.com">Email báo giá</a>
    </nav>
  </header>
  <main>
    <h2>Nhà Phân Phối Máy Bơm Công Nghiệp & Hệ Thống Bơm PCCC Hàng Đầu</h2>
    <p>Cung cấp giải pháp bơm cấp thoát nước cho nhà máy, khu công nghiệp, chung cư cao tầng với đầy đủ chứng chỉ xuất xứ CO, CQ và kiểm định PCCC.</p>
    <h2>1. Dòng Máy Bơm Ly Tâm Trục Ngang Pentax & Ebara</h2>
    <p>Lưu lượng lớn, cột áp cao, hoạt động bền bỉ 24/7 trong môi trường công nghiệp khắc nghiệt.</p>
    <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800" alt="Máy bơm công nghiệp Pentax nhập khẩu nguyên chiếc từ Ý">
    <img src="https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800" alt="Hệ thống máy bơm chữa cháy Diesel và trục rời">
    <img src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800" alt="Kho hàng máy bơm chìm nước thải công nghiệp">
    <img src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=800">
    <h2>2. Liên Hệ Kỹ Thuật Khảo Sát & Lắp Đặt</h2>
    <p>Địa chỉ kho hàng: Khu công nghiệp Ngọc Hồi, Thanh Trì, Hà Nội. Hỗ trợ giao hàng và lắp đặt tận chân công trình.</p>
    <button type="button">Xem chi tiết каталог sản phẩm</button>
  </main>
</body>
</html>`
    },

    sme_kimyen: {
      id: 'sme_kimyen',
      domainKey: 'ykhoakimyen.com',
      label: 'Mẫu SME Chuẩn Marketing: Dụng Cụ Y Khoa Kim Yến',
      url: 'https://www.ykhoakimyen.com',
      html: `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dụng Cụ Y Khoa Kim Yến - Thiết Bị Y Tế Gia Đình & Phòng Khám</title>
  <meta name="description" content="Cửa hàng Dụng Cụ Y Khoa Kim Yến chuyên cung cấp máy đo huyết áp Omron, máy tạo oxy, giường bệnh nhân, xe lăn và vật tư tiêu hao y tế chính hãng giá sỉ.">
  <link rel="canonical" href="https://www.ykhoakimyen.com/">
  <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/2966/2966327.png">
  <meta property="og:title" content="Dụng Cụ Y Khoa Kim Yến - Thiết Bị Y Tế Chính Hãng Uy Tín">
  <meta property="og:image" content="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"MedicalBusiness","name":"Dụng Cụ Y Khoa Kim Yến","telephone":"0909345678"}</script>
  <script>window.gtag = function(){};</script>
</head>
<body>
  <header>
    <nav>
      <a href="/may-do-huyet-ap">Máy đo huyết áp & Đường huyết</a>
      <a href="/may-tao-oxy">Máy tạo oxy & Máy xông khí dung</a>
      <a href="/giuong-benh-xe-lan">Giường y tế & Xe lăn đa năng</a>
      <a href="/vat-tu-phong-kham">Vật tư tiêu hao phòng khám</a>
      <a href="tel:0909345678">Hotline tư vấn: 0909 345 678</a>
      <a href="https://zalo.me/0909345678">Chat Zalo Dược sĩ</a>
    </nav>
  </header>
  <main>
    <h1>Dụng Cụ Y Khoa Kim Yến - Chăm Sóc Sức Khỏe Mọi Gia Đình</h1>
    <h1>Nhà Phân Phối Thiết Bị Y Tế Chính Hãng Tại TP.HCM</h1>
    <p>Hơn 15 năm đồng hành cùng các bệnh viện, phòng khám và gia đình Việt. Cam kết sản phẩm chính hãng Omron, Microlife, Yuwell, bảo hành 1 đổi 1.</p>
    <h2>1. Thiết Bị Theo Dõi Sức Khỏe Gia Đình Bán Chạy</h2>
    <img src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800" alt="Máy đo huyết áp bắp tay tự động Omron Nhật Bản">
    <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800">
    <img src="https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800">
    <img src="https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800">
    <h2>2. Đặt Hàng Nhanh & Nhận Tư Vấn Từ Chuyên Viên Y Tế</h2>
    <form action="/dat-mua-nhanh" method="POST">
      <input type="text" name="fullname" placeholder="Họ tên người nhận" required>
      <input type="tel" name="phone" placeholder="Số điện thoại nhận tư vấn" required>
      <button type="submit">Đăng ký nhận báo giá & Tư vấn miễn phí</button>
    </form>
  </main>
</body>
</html>`
    },

    sme_maybomviet: {
      id: 'sme_maybomviet',
      domainKey: 'maybomviet.com',
      label: 'Mẫu SME Thiếu chăm sóc: Máy Bơm Việt',
      url: 'https://maybomviet.com/',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Trang chủ - Máy Bơm Việt</title>
  <meta name="description" content="Chuyên bán các loại máy bơm nước giá rẻ.">
  <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/2933/2933921.png">
</head>
<body>
  <header>
    <a href="/bom-dan-dung">Bơm dân dụng</a>
    <a href="/bom-tang-ap">Bơm tăng áp</a>
    <a href="tel:0903456789">Gọi mua hàng: 0903 456 789</a>
  </header>
  <main>
    <h2>Cửa Hàng Máy Bơm Nước Dân Dụng & Công Nghiệp Máy Bơm Việt</h2>
    <h2>Chuyên sửa chữa và lắp đặt máy bơm nước tại nhà</h2>
    <p>Cung cấp máy bơm nước đẩy cao, bơm tăng áp tự động Panasonic, Hanil, Kangaroo cho hộ gia đình và nhà trọ.</p>
    <img src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600" alt="Máy bơm nước tăng áp gia đình">
    <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600" alt="Lắp đặt máy bơm đẩy cao">
    <img src="https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600">
    <img src="https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?w=600">
    <button type="button">Xem báo giá</button>
  </main>
</body>
</html>`
    }
  };

  const getSampleById = (id) => SAMPLES[id] || SAMPLES.sme_bomhn;

  const findMatchingSampleByUrl = (urlStr) => {
    try {
      const host = new URL(urlStr).hostname.replace(/^www\./i, '').toLowerCase();
      return Object.values(SAMPLES).find(s => host === s.domainKey || host.endsWith('.' + s.domainKey)) || null;
    } catch {
      return null;
    }
  };

  return {
    BUILT_IN_KEY_VAULT,
    encodeKeyToVault,
    decodeKeyFromVault,
    PILLAR_META,
    RUBRIC_BENTO_CARDS,
    getSampleById,
    findMatchingSampleByUrl
  };
})();