const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const Docker = require('dockerode')
const fs = require('fs')
const path = require('path')
const stream = require('stream')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const docker = new Docker()

app.use(cors())
app.use(express.json())

io.on('connection', (socket) => {
  socket.on('run', async ({ code, input }) => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const fileName  = `main-${Date.now()}.py`;
    const filePath  = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, code);
    const outputStream = new stream.PassThrough();

    outputStream.on('data', chunk => {
      socket.emit('output', chunk.toString());
    });

     const inputStream = new stream.PassThrough();
      inputStream.end(input);

    docker.run(
      'python:3.10',                      
      ['python', `/app/temp/${fileName}`], 
      outputStream,                      
      {
        HostConfig: {
          Binds: [`${__dirname}:/app`],    
          AutoRemove: true
        }
      }
    )
    .then(() => { socket.emit('output', '=== execution finished ===');
    socket.emit('image');
    })
    .catch(err => socket.emit('output', 'ERROR: ' + err.message))
  });
});

server.listen(5000, () => console.log('Server running on http://localhost:5000'))