const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('../middleware/errorHandler');

const authRoutes = require('../routes/auth.routes');
const userRoutes = require('../routes/users.routes');
const studentRoutes = require('../routes/students.routes');
const buildingRoutes = require('../routes/buildings.routes');
const examRoutes = require('../routes/exams.routes');
const registrationRoutes = require('../routes/registrations.routes');
const entryRoutes = require('../routes/entry.routes');
const monitorRoutes = require('../routes/monitor.routes');
const partnerRoutes = require('../routes/partners.routes');
const partnerSelfRoutes = require('../routes/partner.routes');
const schoolRoutes = require('../routes/schools.routes');
const examTypeRoutes = require('../routes/examTypes.routes');
const courseStudentRoutes = require('../routes/courseStudents.routes');
const villageRoutes = require('../routes/villages.routes');
const telesalesRoutes = require('../routes/telesales.routes');
const publicRoutes = require('../routes/public.routes');
const examApplicationRoutes = require('../routes/examApplications.routes');

const app = express();

// Behind a reverse proxy, set TRUST_PROXY (e.g. 1) so req.ip is the client IP for rate limiting
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/exams', registrationRoutes);
app.use('/api/registrations', registrationRoutes); // handles DELETE /api/registrations/:id
app.use('/api/entry', entryRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/partner', partnerSelfRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/exam-types', examTypeRoutes);
app.use('/api/course-students', courseStudentRoutes);
app.use('/api/villages', villageRoutes);
app.use('/api/telesales', telesalesRoutes);
app.use('/api/public', publicRoutes); // landing page, no login (LV#81)
app.use('/api/exam-applications', examApplicationRoutes);

app.use(errorHandler);

module.exports = app;
