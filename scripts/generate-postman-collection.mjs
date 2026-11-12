import fs from 'node:fs';
import path from 'node:path';

function createRequest({
  name,
  method,
  path: urlPath,
  queryParams = [],
  client = 'customer',
  body = null,
  description = '',
  expectedStatus = 200,
  expectedCode = null,
  extractVars = {},
  isNegative = false,
}) {
  const originVar = client === 'admin' ? '{{admin_origin}}' : '{{customer_origin}}';
  const headers = [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'X-Clucky-Client', value: client },
    { key: 'Origin', value: originVar },
  ];

  const testLines = [
    `pm.test("Status code is ${expectedStatus}", function () {`,
    `    pm.response.to.have.status(${expectedStatus});`,
    `});`,
  ];

  if (expectedCode) {
    testLines.push(
      `pm.test("Error code is ${expectedCode}", function () {`,
      `    var json = pm.response.json();`,
      `    pm.expect(json.code).to.eql("${expectedCode}");`,
      `});`
    );
  } else if (!isNegative && expectedStatus < 400) {
    testLines.push(
      `pm.test("Response body is valid JSON", function () {`,
      `    pm.expect(pm.response.text()).to.not.be.empty;`,
      `    pm.response.to.be.json;`,
      `});`
    );
  }

  // Chaining variables
  for (const [varName, jsonPath] of Object.entries(extractVars)) {
    testLines.push(
      `try {`,
      `    var json = pm.response.json();`,
      `    var val = ${jsonPath};`,
      `    if (val !== undefined && val !== null) {`,
      `        pm.environment.set("${varName}", String(val));`,
      `        console.log("Set ${varName} =", val);`,
      `    }`,
      `} catch (e) {}`
    );
  }

  const pathSegments = urlPath.replace(/^\//, '').split('/');
  const query = queryParams.map(q => ({ key: q.key, value: q.value, disabled: false }));

  const item = {
    name: name,
    request: {
      method: method,
      header: headers,
      url: {
        raw: `{{gateway_url}}${urlPath}${query.length > 0 ? '?' + query.map(q => `${q.key}=${q.value}`).join('&') : ''}`,
        host: ['{{gateway_url}}'],
        path: pathSegments,
        query: query.length > 0 ? query : undefined,
      },
      description: description,
    },
    event: [
      {
        listen: 'test',
        script: {
          exec: testLines,
          type: 'text/javascript',
        },
      },
    ],
  };

  if (body) {
    item.request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: {
        raw: {
          language: 'json',
        },
      },
    };
  }

  return item;
}

const collection = {
  info: {
    _postman_id: 'a1b2c3d4-e5f6-47a8-b9c0-123456789abc',
    name: 'Clucky - API Gateway E2E Collection',
    description: 'Postman collection toàn diện cho Clucky Platform qua API Gateway (:8080). Bao gồm Happy Paths, Negative Cases, RBAC, và Chaining IDs giữa các dịch vụ.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    version: '1.0.0',
  },
  item: [
    // 00. AUTH & SESSIONS
    {
      name: '00. Auth & Sessions (BE-09, BE-16, BE-17, BE-76)',
      description: 'Quản lý phiên, xác thực Cookie HttpOnly, CSRF qua Origin, phân quyền Customer và Admin.',
      item: [
        createRequest({
          name: '01. Customer Register - Success',
          method: 'POST',
          path: '/api/auth/register',
          client: 'customer',
          body: {
            fullName: 'Nguyen Van A',
            email: 'customer.test@clucky.vn',
            password: '{{customer_password}}',
            phone: '0901234567',
          },
          expectedStatus: 200,
          description: 'Đăng ký tài khoản khách hàng mới qua Gateway.',
        }),
        createRequest({
          name: '02. Customer Register - Validation Error (Password short)',
          method: 'POST',
          path: '/api/auth/register',
          client: 'customer',
          body: {
            fullName: 'Nguyen Van A',
            email: 'invalid@clucky.vn',
            password: '123',
          },
          expectedStatus: 400,
          expectedCode: 'VALIDATION_ERROR',
          isNegative: true,
          description: 'Kiểm tra từ chối mật khẩu quá ngắn (< 8 ký tự).',
        }),
        createRequest({
          name: '03. Customer Login - Success',
          method: 'POST',
          path: '/api/auth/login',
          client: 'customer',
          body: {
            email: '{{customer_email}}',
            password: '{{customer_password}}',
          },
          expectedStatus: 200,
          extractVars: {
            customerUserId: 'json.userId',
          },
          description: 'Đăng nhập Customer nhận cookie `clucky_customer_access` và thông tin tài khoản.',
        }),
        createRequest({
          name: '04. Customer Login - Invalid Credentials',
          method: 'POST',
          path: '/api/auth/login',
          client: 'customer',
          body: {
            email: '{{customer_email}}',
            password: 'WrongPassword999!',
          },
          expectedStatus: 401,
          expectedCode: 'INVALID_CREDENTIALS',
          isNegative: true,
          description: 'Kiểm tra từ chối sai thông tin đăng nhập.',
        }),
        createRequest({
          name: '05. Customer Session - Get Active Session',
          method: 'GET',
          path: '/api/auth/session',
          client: 'customer',
          expectedStatus: 200,
          description: 'Lấy phiên đăng nhập hiện tại từ cookie.',
        }),
        createRequest({
          name: '06. Customer Refresh Token',
          method: 'POST',
          path: '/api/auth/refresh',
          client: 'customer',
          expectedStatus: 200,
          description: 'Xoay vòng refresh token, gia hạn phiên làm việc.',
        }),
        createRequest({
          name: '07. Admin Login - Success',
          method: 'POST',
          path: '/api/auth/login',
          client: 'admin',
          body: {
            email: '{{admin_email}}',
            password: '{{admin_password}}',
          },
          expectedStatus: 200,
          extractVars: {
            adminUserId: 'json.userId',
          },
          description: 'Đăng nhập Quản trị viên (HQ Admin) nhận cookie `clucky_admin_access`.',
        }),
        createRequest({
          name: '08. Manager Login - Success',
          method: 'POST',
          path: '/api/auth/login',
          client: 'admin',
          body: {
            email: '{{manager_email}}',
            password: '{{manager_password}}',
          },
          expectedStatus: 200,
          extractVars: {
            managerUserId: 'json.userId',
            managerStoreId: 'json.storeId',
          },
          description: 'Đăng nhập Quản lý chi nhánh.',
        }),
        createRequest({
          name: '09. Staff Login - Success',
          method: 'POST',
          path: '/api/auth/login',
          client: 'admin',
          body: {
            email: '{{staff_email}}',
            password: '{{staff_password}}',
          },
          expectedStatus: 200,
          extractVars: {
            staffUserId: 'json.userId',
          },
          description: 'Đăng nhập Nhân viên ca trực chi nhánh.',
        }),
        createRequest({
          name: '10. Customer Logout',
          method: 'POST',
          path: '/api/auth/logout',
          client: 'customer',
          expectedStatus: 200,
          description: 'Đăng xuất và thu hồi session ID trong Redis.',
        }),
      ],
    },

    // 01. CATALOG & STORES
    {
      name: '01. Catalog & Stores (BE-18, BE-20, BE-21)',
      description: 'Quản lý cửa hàng, menu, danh mục món ăn, tồn kho và trạng thái phục vụ.',
      item: [
        createRequest({
          name: '01. List Active Stores',
          method: 'GET',
          path: '/api/stores',
          client: 'customer',
          expectedStatus: 200,
          extractVars: {
            storeId: 'Array.isArray(json) && json.length > 0 ? (json[0].id || 1) : 1',
          },
          description: 'Lấy danh sách các chi nhánh đang hoạt động.',
        }),
        createRequest({
          name: '02. Get Store Details',
          method: 'GET',
          path: '/api/stores/{{storeId}}',
          client: 'customer',
          expectedStatus: 200,
          description: 'Lấy thông tin chi tiết một chi nhánh (giờ mở cửa, hotline, địa chỉ).',
        }),
        createRequest({
          name: '03. List Categories',
          method: 'GET',
          path: '/api/catalog/categories',
          client: 'customer',
          expectedStatus: 200,
          extractVars: {
            categoryId: 'Array.isArray(json) && json.length > 0 ? json[0].id : 1',
          },
          description: 'Lấy danh sách danh mục món ăn.',
        }),
        createRequest({
          name: '04. List Products by Store',
          method: 'GET',
          path: '/api/catalog/products',
          queryParams: [{ key: 'storeId', value: '{{storeId}}' }],
          client: 'customer',
          expectedStatus: 200,
          extractVars: {
            productId: 'json.content && json.content.length > 0 ? json.content[0].id : (Array.isArray(json) && json.length > 0 ? json[0].id : 1)',
          },
          description: 'Lấy menu sản phẩm theo chi nhánh kèm trạng thái còn/hết.',
        }),
        createRequest({
          name: '05. Get Product Details',
          method: 'GET',
          path: '/api/catalog/products/{{productId}}',
          client: 'customer',
          expectedStatus: 200,
          description: 'Lấy chi tiết món ăn, các nhóm tùy chọn (size, sốt) và topping.',
        }),
        createRequest({
          name: '06. Staff Toggle Availability - Success (Own Store)',
          method: 'PUT',
          path: '/api/stores/{{storeId}}/products/{{productId}}/availability',
          client: 'admin',
          body: {
            isAvailable: true,
          },
          expectedStatus: 200,
          description: 'Nhân viên bật/tắt phục vụ món tại quán của mình.',
        }),
        createRequest({
          name: '07. Staff Toggle Availability - Forbidden (Other Store)',
          method: 'PUT',
          path: '/api/stores/9999/products/{{productId}}/availability',
          client: 'admin',
          body: {
            isAvailable: true,
          },
          expectedStatus: 403,
          expectedCode: 'FORBIDDEN',
          isNegative: true,
          description: 'Kiểm tra chặn Staff thao tác trên chi nhánh khác.',
        }),
      ],
    },

    // 02. CART & ORDERS
    {
      name: '02. Cart & Orders (BE-23, BE-24, BE-25, BE-27)',
      description: 'Giỏ hàng Redis, tạo đơn, xem lịch sử và quản lý vòng đời đơn hàng.',
      item: [
        createRequest({
          name: '01. View Cart',
          method: 'GET',
          path: '/api/cart',
          client: 'customer',
          expectedStatus: 200,
          description: 'Lấy giỏ hàng của khách hàng hiện tại từ Redis.',
        }),
        createRequest({
          name: '02. Add Item to Cart',
          method: 'POST',
          path: '/api/cart/items',
          client: 'customer',
          body: {
            productId: 1,
            quantity: 2,
            storeId: 1,
            options: [],
            note: 'Ít cay',
          },
          expectedStatus: 200,
          extractVars: {
            cartItemKey: 'json.items && json.items.length > 0 ? json.items[0].key : ""',
          },
          description: 'Thêm món vào giỏ hàng.',
        }),
        createRequest({
          name: '03. Preview Order Calculation',
          method: 'POST',
          path: '/api/orders/preview',
          client: 'customer',
          body: {
            storeId: 1,
            deliveryAddress: '123 Le Loi, Quan 1, TP.HCM',
            voucherCode: '{{voucherCode}}',
            usePoints: 0,
          },
          expectedStatus: 200,
          description: 'Tính tạm tính đơn hàng (phí ship, giảm giá voucher, trừ điểm tích lũy).',
        }),
        createRequest({
          name: '04. Create Order from Cart',
          method: 'POST',
          path: '/api/orders',
          client: 'customer',
          body: {
            storeId: 1,
            deliveryType: 'DELIVERY',
            deliveryAddress: '123 Le Loi, Quan 1, TP.HCM',
            contactName: 'Nguyen Van A',
            contactPhone: '0901234567',
            paymentMethod: 'COD',
            voucherCode: '',
            usePoints: 0,
            note: 'Giao giờ hành chính',
          },
          expectedStatus: 200,
          extractVars: {
            orderId: 'json.id || json.orderId',
            orderCode: 'json.code || json.orderCode',
          },
          description: 'Tạo đơn hàng mới từ giỏ hàng.',
        }),
        createRequest({
          name: '05. Get My Orders',
          method: 'GET',
          path: '/api/orders/my',
          client: 'customer',
          expectedStatus: 200,
          description: 'Xem danh sách lịch sử đơn hàng của tôi.',
        }),
        createRequest({
          name: '06. Get Order Details',
          method: 'GET',
          path: '/api/orders/{{orderId}}',
          client: 'customer',
          expectedStatus: 200,
          description: 'Xem chi tiết đơn hàng (món ăn, thanh toán, trạng thái giao vận).',
        }),
        createRequest({
          name: '07. Staff View Orders at Store',
          method: 'GET',
          path: '/api/orders',
          queryParams: [{ key: 'storeId', value: '{{storeId}}' }],
          client: 'admin',
          expectedStatus: 200,
          description: 'Nhân viên xem danh sách đơn hàng tại chi nhánh phụ trách.',
        }),
        createRequest({
          name: '08. Staff Update Order Status (CONFIRMED)',
          method: 'PUT',
          path: '/api/orders/{{orderId}}/status',
          client: 'admin',
          body: {
            status: 'CONFIRMED',
            note: 'Đã nhận đơn và chuẩn bị chế biến',
          },
          expectedStatus: 200,
          description: 'Nhân viên xác nhận đơn hàng.',
        }),
        createRequest({
          name: '09. Customer Cancel Order - Valid Stage',
          method: 'PUT',
          path: '/api/orders/{{orderId}}/cancel',
          client: 'customer',
          body: {
            reason: 'Thay đổi kế hoạch dùng bữa',
          },
          expectedStatus: 200,
          description: 'Khách hàng hủy đơn ở trạng thái hợp lệ kèm lý do.',
        }),
        createRequest({
          name: '10. Cancel Order - Invalid State Conflict',
          method: 'PUT',
          path: '/api/orders/{{orderId}}/cancel',
          client: 'customer',
          body: {
            reason: 'Thử hủy lại lần nữa',
          },
          expectedStatus: 409,
          expectedCode: 'RESOURCE_CONFLICT',
          isNegative: true,
          description: 'Kiểm tra từ chối hủy đơn đã hủy hoặc đã hoàn tất.',
        }),
      ],
    },

    // 03. PAYMENTS & RECONCILIATION
    {
      name: '03. Payments & Reconciliation (BE-29, BE-30, BE-32)',
      description: 'Khởi tạo thanh toán, đối soát COD và biên lai chuyển khoản ngân hàng.',
      item: [
        createRequest({
          name: '01. Initiate Payment for Order',
          method: 'POST',
          path: '/api/payments',
          client: 'customer',
          body: {
            orderId: 1,
            paymentMethod: 'COD',
            amount: 50000,
          },
          expectedStatus: 200,
          extractVars: {
            paymentId: 'json.id',
          },
          description: 'Khởi tạo thanh toán cho đơn hàng.',
        }),
        createRequest({
          name: '02. Get Payment Details',
          method: 'GET',
          path: '/api/payments/{{paymentId}}',
          client: 'customer',
          expectedStatus: 200,
          description: 'Lấy trạng thái và chi tiết giao dịch thanh toán.',
        }),
        createRequest({
          name: '03. Staff Collect COD Payment',
          method: 'PUT',
          path: '/api/payments/{{paymentId}}/collect',
          client: 'admin',
          body: {
            amount: 50000,
            note: 'Đã thu đủ tiền mặt từ shipper/khách',
          },
          expectedStatus: 200,
          description: 'Thu ngân/Staff xác nhận thu COD thành công.',
        }),
        createRequest({
          name: '04. Repeat Collect - Resource Conflict',
          method: 'PUT',
          path: '/api/payments/{{paymentId}}/collect',
          client: 'admin',
          body: {
            amount: 50000,
            note: 'Thu lại lần 2',
          },
          expectedStatus: 409,
          expectedCode: 'RESOURCE_CONFLICT',
          isNegative: true,
          description: 'Kiểm tra không cho phép thu tiền trùng cho thanh toán đã thu.',
        }),
      ],
    },

    // 04. PROMOTIONS & LOYALTY
    {
      name: '04. Promotions & Loyalty (BE-33, BE-34, BE-35)',
      description: 'Quản lý mã giảm giá, voucher chi nhánh, tích và đổi điểm thành viên.',
      item: [
        createRequest({
          name: '01. List Active Vouchers',
          method: 'GET',
          path: '/api/promotions/vouchers',
          client: 'customer',
          expectedStatus: 200,
          description: 'Danh sách các voucher khuyến mãi đang có hiệu lực.',
        }),
        createRequest({
          name: '02. Verify Voucher Eligibility',
          method: 'POST',
          path: '/api/promotions/vouchers/verify',
          client: 'customer',
          body: {
            code: '{{voucherCode}}',
            storeId: 1,
            orderAmount: 150000,
          },
          expectedStatus: 200,
          description: 'Kiểm tra tính hợp lệ của voucher theo quán và giá trị đơn.',
        }),
        createRequest({
          name: '03. Get My Loyalty Points',
          method: 'GET',
          path: '/api/loyalty/me',
          client: 'customer',
          expectedStatus: 200,
          description: 'Xem số điểm thưởng và hạng thành viên Clucky Club.',
        }),
        createRequest({
          name: '04. Admin Create Voucher - Success',
          method: 'POST',
          path: '/api/promotions/vouchers',
          client: 'admin',
          body: {
            code: 'CLUCKY_DEP09',
            type: 'FIXED_AMOUNT',
            discountAmount: 20000,
            minOrderAmount: 80000,
            scope: 'ALL',
            totalLimit: 50,
          },
          expectedStatus: 200,
          description: 'Quản trị viên tạo voucher toàn hệ thống.',
        }),
        createRequest({
          name: '05. Staff Create Voucher - Forbidden',
          method: 'POST',
          path: '/api/promotions/vouchers',
          client: 'admin',
          body: {
            code: 'STAFF_FORBIDDEN',
            type: 'PERCENT',
            discountPercent: 10,
          },
          expectedStatus: 403,
          expectedCode: 'FORBIDDEN',
          isNegative: true,
          description: 'Kiểm tra chặn Staff tự ý tạo voucher.',
        }),
      ],
    },

    // 05. SHIPPING
    {
      name: '05. Shipping & Dispatch (BE-38, BE-39)',
      description: 'Ước tính phí giao hàng và tra cứu vận đơn.',
      item: [
        createRequest({
          name: '01. Calculate Shipping Fee',
          method: 'POST',
          path: '/api/shipping/calculate',
          client: 'customer',
          body: {
            storeId: 1,
            destinationAddress: '123 Le Loi, Ben Nghe, Quan 1, TP.HCM',
          },
          expectedStatus: 200,
          description: 'Tính toán phí ship theo khoảng cách địa lý chi nhánh.',
        }),
        createRequest({
          name: '02. Calculate Shipping Fee - Invalid Empty Address',
          method: 'POST',
          path: '/api/shipping/calculate',
          client: 'customer',
          body: {
            storeId: 1,
            destinationAddress: '',
          },
          expectedStatus: 400,
          expectedCode: 'VALIDATION_ERROR',
          isNegative: true,
          description: 'Kiểm tra bắt lỗi địa chỉ rỗng khi tính cước vận chuyển.',
        }),
      ],
    },

    // 06. REVIEWS & REPORTS
    {
      name: '06. Reviews & Reports (BE-40, BE-41, BE-42)',
      description: 'Đánh giá món ăn, phản hồi của chi nhánh, dashboard doanh thu và báo cáo.',
      item: [
        createRequest({
          name: '01. List Product Reviews',
          method: 'GET',
          path: '/api/reviews',
          queryParams: [{ key: 'productId', value: '{{productId}}' }],
          client: 'customer',
          expectedStatus: 200,
          extractVars: {
            reviewId: 'json.content && json.content.length > 0 ? json.content[0].id : 1',
          },
          description: 'Xem các đánh giá và nhận xét công khai của sản phẩm.',
        }),
        createRequest({
          name: '02. Create Customer Review',
          method: 'POST',
          path: '/api/reviews',
          client: 'customer',
          body: {
            orderId: 1,
            productId: 1,
            rating: 5,
            comment: 'Gà rán rất giòn và sốt đậm đà ngon tuyệt!',
          },
          expectedStatus: 200,
          description: 'Khách hàng viết đánh giá sau khi hoàn thành đơn.',
        }),
        createRequest({
          name: '03. Staff Reply to Review',
          method: 'POST',
          path: '/api/reviews/{{reviewId}}/reply',
          client: 'admin',
          body: {
            content: 'Cảm ơn quý khách đã ủng hộ Clucky! Chúc quý khách ngon miệng.',
          },
          expectedStatus: 200,
          description: 'Nhân viên chi nhánh gửi phản hồi khách hàng.',
        }),
        createRequest({
          name: '04. Admin View Revenue Dashboard',
          method: 'GET',
          path: '/api/reports/dashboard',
          queryParams: [{ key: 'storeId', value: '{{storeId}}' }],
          client: 'admin',
          expectedStatus: 200,
          description: 'Admin hoặc Manager xem dashboard thống kê doanh thu chi nhánh.',
        }),
        createRequest({
          name: '05. Staff View Revenue Dashboard - Forbidden',
          method: 'GET',
          path: '/api/reports/dashboard',
          queryParams: [{ key: 'storeId', value: '{{storeId}}' }],
          client: 'admin',
          expectedStatus: 403,
          expectedCode: 'FORBIDDEN',
          isNegative: true,
          description: 'Kiểm tra chặn Staff xem báo cáo doanh thu tài chính.',
        }),
      ],
    },

    // 07. NOTIFICATIONS & ADMIN AUDIT
    {
      name: '07. Notifications & Admin Audit (BE-43, BE-63, UI-50)',
      description: 'Nhật ký gửi email, gửi lại email lỗi an toàn và nhật ký quản trị tập trung.',
      item: [
        createRequest({
          name: '01. Admin Query Email Logs (Filters)',
          method: 'GET',
          path: '/api/notifications/email-logs',
          queryParams: [
            { key: 'page', value: '0' },
            { key: 'size', value: '20' },
            { key: 'status', value: 'FAILED' },
          ],
          client: 'admin',
          expectedStatus: 200,
          extractVars: {
            emailLogId: 'json.content && json.content.length > 0 ? json.content[0].id : 1',
          },
          description: 'Tra cứu nhật ký email theo bộ lọc trạng thái, người nhận, mẫu email.',
        }),
        createRequest({
          name: '02. Admin Retry Failed Email',
          method: 'POST',
          path: '/api/notifications/email-logs/{{emailLogId}}/retry',
          client: 'admin',
          expectedStatus: 200,
          description: 'Gửi lại email lỗi (chuyển sang QUEUED và tăng retry count).',
        }),
        createRequest({
          name: '03. Admin Get Audit Logs',
          method: 'GET',
          path: '/api/audit-logs',
          client: 'admin',
          expectedStatus: 200,
          description: 'Xem nhật ký thay đổi quản trị tập trung (Audit Service).',
        }),
        createRequest({
          name: '04. Non-Admin View Audit Logs - Forbidden',
          method: 'GET',
          path: '/api/audit-logs',
          client: 'customer',
          expectedStatus: 403,
          expectedCode: 'FORBIDDEN',
          isNegative: true,
          description: 'Kiểm tra chặn người dùng không có quyền truy cập nhật ký kiểm toán.',
        }),
      ],
    },

    // 99. FIXTURE CLEANUP
    {
      name: '99. Safe Fixture Cleanup (DEP-09)',
      description: 'Dọn dẹp giỏ hàng và dữ liệu tạm thời tạo ra trong quá trình chạy test, không xóa database chung.',
      item: [
        createRequest({
          name: '01. Clear Test Cart',
          method: 'DELETE',
          path: '/api/cart',
          client: 'customer',
          expectedStatus: 200,
          description: 'Xóa giỏ hàng test đã tạo.',
        }),
      ],
    },
  ],
};

const outputPath = path.join(process.cwd(), 'architechture', 'postman', 'Clucky-API-Gateway.postman_collection.json');
fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2), 'utf-8');
console.log('Successfully generated Postman collection at:', outputPath);
