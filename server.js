const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const path = require("path")
const multer = require("multer")
const { v4: uuidv4 } = require("uuid")

const app = express()
const server = http.createServer(app)

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// Проверка разрешенных доменов
const allowedDomains = [
  "https://acto-uimuz.vercel.app",
  "https://actogr.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const isAllowed = allowedDomains.some((domain) => origin.startsWith(domain))
      if (isAllowed) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS - Domain access restricted"))
      }
    },
    methods: ["GET", "POST"],
  },
})

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      const isAllowed = allowedDomains.some((domain) => origin.startsWith(domain))
      if (isAllowed) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
  }),
)

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

// Хранилище данных в памяти
const users = new Map()
const chats = new Map()
const messages = new Map()
const privateChats = new Map()

// Создаем общий чат при запуске
const generalChatId = "general"
chats.set(generalChatId, {
  id: generalChatId,
  name: "Umumiy chat",
  isGroup: true,
  participants: [],
  createdAt: new Date(),
  type: "group",
})
messages.set(generalChatId, [])

// Middleware для проверки домена
const checkDomain = (req, res, next) => {
  const origin = req.get("origin") || req.get("host")
  const isAllowed = allowedDomains.some(
    (domain) =>
      origin && (origin.includes("vercel.app") || origin.includes("render.com") || origin.includes("localhost")),
  )

  if (!isAllowed && req.path.startsWith("/api")) {
    return res.status(403).json({ error: "Domain access restricted" })
  }
  next()
}

// Главная страница
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="uz">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ACTOGRAM Server</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            h1 { color: #fff; text-align: center; margin-bottom: 30px; }
            .status { 
                background: rgba(0,255,0,0.2); 
                padding: 15px; 
                border-radius: 8px; 
                margin: 20px 0;
                text-align: center;
                font-size: 18px;
            }
            .info {
                background: rgba(255,255,255,0.1);
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .api-link {
                color: #fff;
                text-decoration: none;
                background: rgba(255,255,255,0.2);
                padding: 8px 15px;
                border-radius: 5px;
                display: inline-block;
                margin: 5px;
                transition: all 0.3s;
            }
            .api-link:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            .client-link {
                background: rgba(0,255,0,0.3);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                text-decoration: none;
                display: inline-block;
                margin: 10px 0;
                font-size: 18px;
                font-weight: bold;
                transition: all 0.3s;
            }
            .client-link:hover {
                background: rgba(0,255,0,0.4);
                transform: scale(1.05);
            }
            code {
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 ACTOGRAM Server</h1>
            
            <div class="status">
                ✅ Server mukammal ishlayapti!
            </div>
            
            <div class="info">
                <h3>💬 Mijoz ilovasi:</h3>
                <a href="https://acto-uimuz.vercel.app" class="client-link" target="_blank">
                    🌐 ACTOGRAM Chat ochish
                </a>
                <p>Asosiy ilova Vercel'da joylashtirilgan</p>
            </div>
            
            <div class="info">
                <h3>📊 Server statistikasi:</h3>
                <p>• Faol foydalanuvchilar: <strong>${users.size}</strong></p>
                <p>• Faol chatlar: <strong>${chats.size}</strong></p>
                <p>• Umumiy chatdagi xabarlar: <strong>${messages.get(generalChatId)?.length || 0}</strong></p>
                <p>• Ishlash vaqti: <strong>${Math.floor(process.uptime() / 60)} daqiqa</strong></p>
                <p>• Oxirgi yangilanish: <strong>${new Date().toLocaleString("uz-UZ")}</strong></p>
            </div>
            
            <div class="info">
                <h3>🔗 API Endpoints:</h3>
                <a href="/api/health" class="api-link" target="_blank">Health Check</a>
                <a href="/api/chats" class="api-link" target="_blank">Chatlar ro'yxati</a>
                <a href="/api/upload" class="api-link" target="_blank">Fayl yuklash</a>
                <p style="margin-top: 10px; font-size: 14px; opacity: 0.8;">
                    API faqat ruxsat etilgan domenlar uchun mavjud
                </p>
            </div>
            
            <div class="info">
                <h3>🌐 Ruxsat etilgan domenlar:</h3>
                ${allowedDomains.map((domain) => `<p>• <code>${domain}</code></p>`).join("")}
            </div>
            
            <div class="info">
                <h3>⚡ WebSocket aloqasi:</h3>
                <p>Socket.IO server: <code>${req.protocol}://${req.get("host")}</code></p>
                <p>Holat: <span id="ws-status">Tekshirilmoqda...</span></p>
            </div>
        </div>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const statusEl = document.getElementById('ws-status');
            
            socket.on('connect', () => {
                statusEl.innerHTML = '<span style="color: #00ff00;">🟢 Ulandi</span>';
                console.log('WebSocket ulandi:', socket.id);
            });
            
            socket.on('disconnect', () => {
                statusEl.innerHTML = '<span style="color: #ff0000;">🔴 Uzildi</span>';
            });
            
            socket.on('connect_error', () => {
                statusEl.innerHTML = '<span style="color: #ff0000;">❌ Ulanishda xatolik</span>';
            });
        </script>
    </body>
    </html>
  `)
})

// API Routes
app.get("/api/health", checkDomain, (req, res) => {
  res.json({
    status: "ACTOGRAM server mukammal ishlayapti",
    timestamp: new Date().toISOString(),
    activeUsers: users.size,
    activeChats: chats.size,
    uptime: process.uptime(),
    clientUrl: "https://acto-uimuz.vercel.app",
    version: "2.0.0",
  })
})

app.get("/api/chats", checkDomain, (req, res) => {
  const chatList = Array.from(chats.values()).map((chat) => ({
    ...chat,
    lastMessage: messages.get(chat.id)?.slice(-1)[0] || null,
    messageCount: messages.get(chat.id)?.length || 0,
  }))
  res.json(chatList)
})

app.get("/api/messages/:chatId", checkDomain, (req, res) => {
  const { chatId } = req.params
  const chatMessages = messages.get(chatId) || []
  res.json(chatMessages)
})

// Загрузка файлов
app.post("/api/upload", checkDomain, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Fayl topilmadi" })
    }

    const fileId = uuidv4()
    const fileUrl = `/uploads/${fileId}_${req.file.originalname}`

    // В реальном приложении сохраняем файл
    // Здесь просто возвращаем URL

    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
    })
  } catch (error) {
    res.status(500).json({ error: "Fayl yuklashda xatolik" })
  }
})

// Socket.IO обработка соединений
io.on("connection", (socket) => {
  console.log("Yangi ulanish:", socket.id)

  // Проверка домена для WebSocket
  const origin = socket.handshake.headers.origin
  const isAllowed = allowedDomains.some(
    (domain) =>
      origin && (origin.includes("vercel.app") || origin.includes("render.com") || origin.includes("localhost")),
  )

  if (!isAllowed && origin) {
    console.log("Domendan ulanish rad etildi:", origin)
    socket.disconnect()
    return
  }

  // Регистрация пользователя
  socket.on("register", (userData) => {
    const user = {
      id: userData.id || uuidv4(),
      username: userData.username,
      socketId: socket.id,
      isOnline: true,
      joinedAt: new Date(),
      avatar: userData.avatar,
      bio: userData.bio,
    }

    users.set(socket.id, user)

    // Добавляем пользователя в общий чат
    const generalChat = chats.get(generalChatId)
    if (generalChat && !generalChat.participants.find((p) => p.id === user.id)) {
      generalChat.participants.push(user)
    }

    socket.join(generalChatId)

    // Уведомляем всех о новом пользователе
    socket.to(generalChatId).emit("user_joined", {
      user: user,
      message: `${user.username} ACTOGRAM'ga qo'shildi`,
    })

    // Отправляем список активных пользователей
    const activeUsers = Array.from(users.values())
    io.emit("users_update", activeUsers)

    console.log(`Foydalanuvchi ${user.username} ro'yxatdan o'tdi`)
  })

  // Поиск пользователей
  socket.on("search_users", (query) => {
    const currentUser = users.get(socket.id)
    if (!currentUser) return

    const results = Array.from(users.values())
      .filter((user) => user.id !== currentUser.id && user.username.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)

    socket.emit("search_results", results)
  })

  // Создание приватного чата
  socket.on("create_private_chat", (data) => {
    const { userId, chatId } = data
    const currentUser = users.get(socket.id)
    const targetUser = Array.from(users.values()).find((u) => u.id === userId)

    if (!currentUser || !targetUser) return

    if (!chats.has(chatId)) {
      const privateChat = {
        id: chatId,
        name: targetUser.username,
        avatar: targetUser.avatar,
        isGroup: false,
        participants: [currentUser, targetUser],
        createdAt: new Date(),
        type: "private",
      }

      chats.set(chatId, privateChat)
      messages.set(chatId, [])

      // Уведомляем обоих пользователей о новом чате
      const targetSocket = Array.from(io.sockets.sockets.values()).find((s) => users.get(s.id)?.id === userId)

      if (targetSocket) {
        targetSocket.join(chatId)
        targetSocket.emit("new_private_chat", privateChat)
      }

      socket.join(chatId)
      socket.emit("new_private_chat", privateChat)
    }
  })

  // Присоединение к чату
  socket.on("join_chat", (chatId) => {
    socket.join(chatId)
    console.log(`Foydalanuvchi chatga qo'shildi: ${chatId}`)
  })

  // Отправка сообщения
  socket.on("send_message", (messageData) => {
    const user = users.get(socket.id)
    if (!user) return

    const message = {
      id: uuidv4(),
      senderId: user.id,
      senderName: user.username,
      content: messageData.content,
      chatId: messageData.chatId,
      timestamp: new Date(),
      type: messageData.type || "text",
      fileUrl: messageData.fileUrl,
      fileName: messageData.fileName,
      fileSize: messageData.fileSize,
    }

    // Сохраняем сообщение
    if (!messages.has(messageData.chatId)) {
      messages.set(messageData.chatId, [])
    }
    messages.get(messageData.chatId).push(message)

    // Отправляем сообщение всем в чате
    io.to(messageData.chatId).emit("new_message", message)

    console.log(`${user.username}dan xabar ${messageData.chatId} chatiga: ${messageData.content}`)
  })

  // Обновление профиля
  socket.on("update_profile", (userData) => {
    const user = users.get(socket.id)
    if (!user) return

    const updatedUser = { ...user, ...userData }
    users.set(socket.id, updatedUser)

    // Обновляем пользователя во всех чатах
    for (const chat of chats.values()) {
      const participantIndex = chat.participants.findIndex((p) => p.id === user.id)
      if (participantIndex !== -1) {
        chat.participants[participantIndex] = updatedUser
      }
    }

    // Уведомляем всех об обновлении
    const activeUsers = Array.from(users.values())
    io.emit("users_update", activeUsers)

    console.log(`${user.username} profilini yangiladi`)
  })

  // Пользователь печатает
  socket.on("typing", (data) => {
    const user = users.get(socket.id)
    if (user) {
      socket.to(data.chatId).emit("user_typing", {
        userId: user.id,
        username: user.username,
        chatId: data.chatId,
      })
    }
  })

  // Пользователь перестал печатать
  socket.on("stop_typing", (data) => {
    const user = users.get(socket.id)
    if (user) {
      socket.to(data.chatId).emit("user_stop_typing", {
        userId: user.id,
        chatId: data.chatId,
      })
    }
  })

  // Отключение пользователя
  socket.on("disconnect", () => {
    const user = users.get(socket.id)
    if (user) {
      // Удаляем пользователя из общего чата
      const generalChat = chats.get(generalChatId)
      if (generalChat) {
        generalChat.participants = generalChat.participants.filter((p) => p.id !== user.id)
      }

      // Уведомляем о выходе пользователя
      socket.to(generalChatId).emit("user_left", {
        user: user,
        message: `${user.username} ACTOGRAM'dan chiqdi`,
      })

      users.delete(socket.id)

      // Обновляем список активных пользователей
      const activeUsers = Array.from(users.values())
      io.emit("users_update", activeUsers)

      console.log(`Foydalanuvchi ${user.username} uzildi`)
    }
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 ACTOGRAM server ${PORT} portida ishga tushdi`)
  console.log(`📱 Mijoz: https://acto-uimuz.vercel.app`)
  console.log(`🌐 Server: https://actogr.onrender.com`)
  console.log(`💬 Umumiy chat yaratildi ID: ${generalChatId}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal qabul qilindi, server to'xtatilmoqda...")
  server.close(() => {
    console.log("Server to'xtatildi")
    process.exit(0)
  })
})
