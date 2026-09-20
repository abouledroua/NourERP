import http from 'http';

const BASE_URL = 'http://127.0.0.1:5000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': 'TEST-DEV-UUID-001',
        'x-workstation-name': 'HQ-PRIMARY-PC',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Al-Nour ERP Automated API Tests ---');
  let token = null;

  try {
    // 1. Health check
    console.log('[1/12] Testing Health Endpoint...');
    const health = await request('GET', '/api/health');
    console.log('       Health Status:', health.status, health.data.name);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Static frontend check
    console.log('[2/12] Testing Frontend Static Serving (/)...');
    const indexHtml = await request('GET', '/');
    if (indexHtml.status !== 200 || !String(indexHtml.data).includes('<div id="root">')) {
      throw new Error('Frontend static serving failed');
    }
    console.log('       Frontend Root HTML served successfully!');

    // 3. Login
    console.log('[3/12] Testing Auth Login (admin/admin123)...');
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    if (loginRes.status !== 200 || !loginRes.data.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }
    token = loginRes.data.token;
    console.log('       Login successful! User:', loginRes.data.user.full_name, 'Role:', loginRes.data.user.role);

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 4. Dashboard data
    console.log('[4/12] Testing Dashboard Analytics Endpoint (/api/dashboard)...');
    const dashRes = await request('GET', '/api/dashboard', null, authHeaders);
    if (dashRes.status !== 200 || !dashRes.data.success) {
      throw new Error(`Dashboard failed: ${JSON.stringify(dashRes.data)}`);
    }
    console.log('       Dashboard loaded! Total students:', dashRes.data.data.students.total, 'Teachers:', dashRes.data.data.teachers.total);

    // 5. Students list
    console.log('[5/12] Testing Students Endpoint (/api/students)...');
    const studentsRes = await request('GET', '/api/students', null, authHeaders);
    if (studentsRes.status !== 200 || !studentsRes.data.success) {
      throw new Error(`Students endpoint failed: ${JSON.stringify(studentsRes.data)}`);
    }
    console.log('       Students loaded! Count:', studentsRes.data.data.length);

    // 6. Classes & Tracks
    console.log('[6/12] Testing Classes Endpoint (/api/classes)...');
    const classesRes = await request('GET', '/api/classes', null, authHeaders);
    if (classesRes.status !== 200 || !classesRes.data.success) {
      throw new Error(`Classes endpoint failed: ${JSON.stringify(classesRes.data)}`);
    }
    console.log('       Classes loaded! Count:', classesRes.data.data.length);

    // 7. Teachers
    console.log('[7/12] Testing Teachers Endpoint (/api/teachers)...');
    const teachersRes = await request('GET', '/api/teachers', null, authHeaders);
    if (teachersRes.status !== 200 || !teachersRes.data.success) {
      throw new Error(`Teachers endpoint failed: ${JSON.stringify(teachersRes.data)}`);
    }
    console.log('       Teachers loaded! Count:', teachersRes.data.data.length);

    // 8. Fused Ledger & KPIs
    console.log('[8/12] Testing Fused Financial Ledger (/api/finance/ledger)...');
    const ledgerRes = await request('GET', '/api/finance/ledger', null, authHeaders);
    if (ledgerRes.status !== 200 || !ledgerRes.data.success) {
      throw new Error(`Ledger endpoint failed: ${JSON.stringify(ledgerRes.data)}`);
    }
    console.log('       Fused Ledger loaded! Transactions count:', ledgerRes.data.data.length);

    console.log('       Testing Financial KPIs (/api/finance/kpis)...');
    const kpisRes = await request('GET', '/api/finance/kpis', null, authHeaders);
    if (kpisRes.status !== 200 || !kpisRes.data.success) {
      throw new Error(`KPIs endpoint failed: ${JSON.stringify(kpisRes.data)}`);
    }
    console.log('       KPIs loaded! Tuition Paid:', kpisRes.data.data.tuitionPaid, 'Store Paid:', kpisRes.data.data.storePaid, 'Net Balance:', kpisRes.data.data.netOperatingBalance);

    // 9. Store POS Products & Sales
    console.log('[9/12] Testing POS Products & Sales (/api/pos/products, /api/pos/sales)...');
    const productsRes = await request('GET', '/api/pos/products', null, authHeaders);
    if (productsRes.status !== 200 || !productsRes.data.success) {
      throw new Error(`POS products failed: ${JSON.stringify(productsRes.data)}`);
    }
    console.log('       POS Products loaded! Count:', productsRes.data.data.length);

    const salesRes = await request('GET', '/api/pos/sales', null, authHeaders);
    if (salesRes.status !== 200 || !salesRes.data.success) {
      throw new Error(`POS sales failed: ${JSON.stringify(salesRes.data)}`);
    }
    console.log('       POS Sales loaded! Count:', salesRes.data.data.length);

    // 10. Timetable & Attendance
    console.log('[10/12] Testing Timetable (/api/timetable) & Attendance (/api/attendance/roster)...');
    const ttRes = await request('GET', '/api/timetable', null, authHeaders);
    if (ttRes.status !== 200 || !ttRes.data.success) {
      throw new Error(`Timetable endpoint failed: ${JSON.stringify(ttRes.data)}`);
    }
    const attRes = await request('GET', '/api/attendance/roster?classId=1&date=2025-09-15', null, authHeaders);
    if (attRes.status !== 200 || !attRes.data.success) {
      throw new Error(`Attendance endpoint failed: ${JSON.stringify(attRes.data)}`);
    }
    console.log('       Timetable slots:', ttRes.data.data.length, 'Attendance roster records:', attRes.data.data.length);

    // 11. Grades
    console.log('[11/12] Testing Grade Matrix (/api/grades/matrix)...');
    const gradesRes = await request('GET', '/api/grades/matrix?classId=1&termId=1', null, authHeaders);
    if (gradesRes.status !== 200 || !gradesRes.data.success) {
      throw new Error(`Grades endpoint failed: ${JSON.stringify(gradesRes.data)}`);
    }
    console.log('       Grade Matrix loaded! Students evaluated:', gradesRes.data.data.students?.length || 0);

    // 12. Settings & Audit Logs
    console.log('[12/12] Testing Settings (/api/settings) & Audit Logs (/api/audit)...');
    const settRes = await request('GET', '/api/settings', null, authHeaders);
    if (settRes.status !== 200 || !settRes.data.success) {
      throw new Error(`Settings endpoint failed: ${JSON.stringify(settRes.data)}`);
    }
    const auditRes = await request('GET', '/api/audit', null, authHeaders);
    if (auditRes.status !== 200 || !auditRes.data.success) {
      throw new Error(`Audit endpoint failed: ${JSON.stringify(auditRes.data)}`);
    }
    console.log('       System Settings & Audit Logs loaded! Audit count:', auditRes.data.data.length);

    console.log('\n======================================================');
    console.log(' ALL 12 API & SYSTEM INTEGRATION TESTS PASSED 100%! ');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
    process.exit(1);
  }
}

runTests();
