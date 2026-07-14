require('dotenv').config();
const http = require('http');
const app = require('./config/app');
const { initSocket } = require('./sockets/entrySocket');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
