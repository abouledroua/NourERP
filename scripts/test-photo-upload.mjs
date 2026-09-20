import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:5000';

// Minimal 1x1 valid PNG
const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const samplePngBuffer = Buffer.from(samplePngBase64, 'base64');

function rawRequest(method, urlPath, headers = {}, bodyBuffer = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'x-device-fingerprint': 'DEVTEST1',
        'x-workstation-name': 'TEST-STATION',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let json = null;
        try {
          json = JSON.parse(buf.toString('utf8'));
        } catch {
          json = buf.toString('utf8');
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers, raw: buf });
      });
    });

    req.on('error', reject);
    if (bodyBuffer) {
      req.write(bodyBuffer);
    }
    req.end();
  });
}

function uploadMultipart(urlPath, token, fieldName, filename, fileBuffer, mimeType) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';

  const header = `--${boundary}${crlf}` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}` +
    `Content-Type: ${mimeType}${crlf}${crlf}`;
  const footer = `${crlf}--${boundary}--${crlf}`;

  const fullPayload = Buffer.concat([
    Buffer.from(header, 'utf8'),
    fileBuffer,
    Buffer.from(footer, 'utf8')
  ]);

  return rawRequest('POST', urlPath, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Authorization': `Bearer ${token}`
  }, fullPayload);
}

async function run() {
  console.log('=== Verifying Photo Upload for Students & Teachers ===');

  // 1. Authenticate to get token
  console.log('1. Authenticating as admin...');
  const loginRes = await rawRequest('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, Buffer.from(JSON.stringify({
    username: 'admin',
    password: 'admin123'
  })));

  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Authentication failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.token;
  console.log('   Authenticated successfully!');

  // 2. Test Student Photo Upload
  console.log('2. Uploading student photo to /api/upload/student...');
  const stuUploadRes = await uploadMultipart('/api/upload/student', token, 'photo', 'sample_student.png', samplePngBuffer, 'image/png');
  console.log('   Upload status:', stuUploadRes.status);
  console.log('   Response:', stuUploadRes.data);
  if (stuUploadRes.status !== 200 || !stuUploadRes.data.photo_url) {
    throw new Error('Student photo upload failed: ' + JSON.stringify(stuUploadRes.data));
  }
  const studentPhotoUrl = stuUploadRes.data.photo_url;
  if (!studentPhotoUrl.startsWith('/Uploads/Students/student-')) {
    throw new Error('Invalid student photo url: ' + studentPhotoUrl);
  }

  // 3. Test Teacher Photo Upload
  console.log('3. Uploading teacher photo to /api/upload/teacher...');
  const teaUploadRes = await uploadMultipart('/api/upload/teacher', token, 'photo', 'sample_teacher.png', samplePngBuffer, 'image/png');
  console.log('   Upload status:', teaUploadRes.status);
  console.log('   Response:', teaUploadRes.data);
  if (teaUploadRes.status !== 200 || !teaUploadRes.data.photo_url) {
    throw new Error('Teacher photo upload failed: ' + JSON.stringify(teaUploadRes.data));
  }
  const teacherPhotoUrl = teaUploadRes.data.photo_url;
  if (!teacherPhotoUrl.startsWith('/Uploads/Teachers/teacher-')) {
    throw new Error('Invalid teacher photo url: ' + teacherPhotoUrl);
  }

  // 4. Verify file exists on disk
  console.log('4. Verifying files exist on disk...');
  const studentFilePath = path.join(__dirname, '..', 'backend', studentPhotoUrl.replace(/^\//, ''));
  const teacherFilePath = path.join(__dirname, '..', 'backend', teacherPhotoUrl.replace(/^\//, ''));

  if (!fs.existsSync(studentFilePath)) {
    throw new Error('Student photo file not found at: ' + studentFilePath);
  }
  if (!fs.existsSync(teacherFilePath)) {
    throw new Error('Teacher photo file not found at: ' + teacherFilePath);
  }
  console.log('   Student file confirmed at:', studentFilePath);
  console.log('   Teacher file confirmed at:', teacherFilePath);

  // 5. Verify static serving via HTTP GET
  console.log('5. Verifying static serving via HTTP GET...');
  const stuHttpRes = await rawRequest('GET', studentPhotoUrl);
  if (stuHttpRes.status !== 200) {
    throw new Error(`Failed to retrieve student photo via HTTP ${studentPhotoUrl}, status: ${stuHttpRes.status}`);
  }
  const teaHttpRes = await rawRequest('GET', teacherPhotoUrl);
  if (teaHttpRes.status !== 200) {
    throw new Error(`Failed to retrieve teacher photo via HTTP ${teacherPhotoUrl}, status: ${teaHttpRes.status}`);
  }
  console.log('   Both photos successfully retrieved via HTTP GET 200 OK!');

  // 6. Test Creating Student with photo_url
  console.log('6. Creating a student with photo_url...');
  const studentData = {
    first_name_ar: 'ياسين',
    last_name_ar: 'المنصوري',
    first_name_en: 'Yassine',
    last_name_en: 'Mansouri',
    gender: 'MALE',
    birth_date: '2016-09-12',
    academic_track_id: 1,
    parent_name: 'كريم المنصوري',
    parent_phone: '0555123456',
    photo_url: studentPhotoUrl
  };

  const createStuRes = await rawRequest('POST', '/api/students', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }, Buffer.from(JSON.stringify(studentData)));

  console.log('   Create student status:', createStuRes.status, createStuRes.data);
  if (createStuRes.status !== 201) {
    throw new Error('Create student failed: ' + JSON.stringify(createStuRes.data));
  }
  const createdStudentId = createStuRes.data.data.id;

  // Retrieve dossier to confirm photo_url in DB
  const dossierRes = await rawRequest('GET', `/api/students/${createdStudentId}`, {
    'Authorization': `Bearer ${token}`
  });
  if (dossierRes.status !== 200 || dossierRes.data.data.student.photo_url !== studentPhotoUrl) {
    throw new Error('Student photo_url verification in DB failed: ' + JSON.stringify(dossierRes.data));
  }
  console.log('   Student saved & verified in DB with photo_url:', dossierRes.data.data.student.photo_url);

  // 7. Test Creating Teacher with photo_url
  console.log('7. Creating a teacher with photo_url...');
  const teacherData = {
    first_name: 'أحمد',
    last_name: 'براهيمي',
    specialty: 'علوم الطبيعة والحياة',
    phone: '0661234567',
    photo_url: teacherPhotoUrl
  };

  const createTeaRes = await rawRequest('POST', '/api/teachers', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }, Buffer.from(JSON.stringify(teacherData)));

  console.log('   Create teacher status:', createTeaRes.status, createTeaRes.data);
  if (createTeaRes.status !== 201) {
    throw new Error('Create teacher failed: ' + JSON.stringify(createTeaRes.data));
  }
  const createdTeacherId = createTeaRes.data.id;

  // Retrieve teacher list to confirm photo_url
  const teaListRes = await rawRequest('GET', '/api/teachers?search=براهيمي', {
    'Authorization': `Bearer ${token}`
  });
  const foundTeacher = teaListRes.data.data.find(t => t.id === createdTeacherId);
  if (!foundTeacher || foundTeacher.photo_url !== teacherPhotoUrl) {
    throw new Error('Teacher photo_url verification in DB failed: ' + JSON.stringify(teaListRes.data));
  }
  console.log('   Teacher saved & verified in DB with photo_url:', foundTeacher.photo_url);

  console.log('\n========================================');
  console.log(' ALL PHOTO UPLOAD TESTS PASSED SUCCESSFULLY! ');
  console.log('========================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
