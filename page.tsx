"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  MessageCircle,
  Users,
  Settings,
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  Wifi,
  WifiOff,
  Paperclip,
  ImageIcon,
  File,
  Camera,
  UserPlus,
  Upload,
} from "lucide-react"
import { io, type Socket } from "socket.io-client"

interface User {
  id: string
  username: string
  avatar?: string
  isOnline: boolean
  lastSeen?: string
  bio?: string
}

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  chatId: string
  timestamp: Date
  type: "text" | "image" | "file" | "audio"
  fileUrl?: string
  fileName?: string
  fileSize?: number
}

interface Chat {
  id: string
  name: string
  avatar?: string
  lastMessage?: Message
  unreadCount: number
  isGroup: boolean
  participants: User[]
  messageCount: number
  type: "private" | "group"
}

interface Language {
  code: string
  name: string
  flag: string
}

const languages: Language[] = [
  { code: "uz", name: "O'zbek", flag: "🇺🇿" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "en", name: "English", flag: "🇺🇸" },
]

const translations = {
  uz: {
    welcome: "Actogram'ga xush kelibsiz",
    enterName: "Ismingizni kiriting",
    login: "Kirish",
    connecting: "Ulanmoqda...",
    connected: "Ulandi",
    disconnected: "Aloqa uzildi",
    online: "Onlayn",
    offline: "Oflayn",
    searchChats: "Chatlarni qidirish...",
    searchUsers: "Foydalanuvchilarni qidirish...",
    typeMessage: "Xabar yozing...",
    send: "Yuborish",
    typing: "yozmoqda...",
    generalChat: "Umumiy chat",
    settings: "Sozlamalar",
    profile: "Profil",
    notifications: "Bildirishnomalar",
    darkMode: "Tungi rejim",
    language: "Til",
    selectAvatar: "Avatar tanlash",
    uploadFile: "Fayl yuklash",
    participants: "ishtirokchilar",
    messages: "xabarlar",
    newChat: "Yangi chat",
    addUser: "Foydalanuvchi qo'shish",
    bio: "Bio",
    lastSeen: "Oxirgi ko'rilgan",
    fileUploaded: "Fayl yuklandi",
    imageUploaded: "Rasm yuklandi",
    save: "Saqlash",
    cancel: "Bekor qilish",
    close: "Yopish",
    selectFromGallery: "Galereyadan tanlash",
    takePhoto: "Rasm olish",
    uploadFromDevice: "Qurilmadan yuklash",
  },
  ru: {
    welcome: "Добро пожаловать в Actogram",
    enterName: "Введите ваше имя",
    login: "Войти",
    connecting: "Подключение...",
    connected: "Подключено",
    disconnected: "Отключено",
    online: "Онлайн",
    offline: "Оффлайн",
    searchChats: "Поиск чатов...",
    searchUsers: "Поиск пользователей...",
    typeMessage: "Напишите сообщение...",
    send: "Отправить",
    typing: "печатает...",
    generalChat: "Общий чат",
    settings: "Настройки",
    profile: "Профиль",
    notifications: "Уведомления",
    darkMode: "Темная тема",
    language: "Язык",
    selectAvatar: "Выбрать аватар",
    uploadFile: "Загрузить файл",
    participants: "участников",
    messages: "сообщений",
    newChat: "Новый чат",
    addUser: "Добавить пользователя",
    bio: "О себе",
    lastSeen: "Был в сети",
    fileUploaded: "Файл загружен",
    imageUploaded: "Изображение загружено",
    save: "Сохранить",
    cancel: "Отмена",
    close: "Закрыть",
    selectFromGallery: "Выбрать из галереи",
    takePhoto: "Сделать фото",
    uploadFromDevice: "Загрузить с устройства",
  },
  en: {
    welcome: "Welcome to Actogram",
    enterName: "Enter your name",
    login: "Login",
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected",
    online: "Online",
    offline: "Offline",
    searchChats: "Search chats...",
    searchUsers: "Search users...",
    typeMessage: "Type a message...",
    send: "Send",
    typing: "typing...",
    generalChat: "General Chat",
    settings: "Settings",
    profile: "Profile",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    language: "Language",
    selectAvatar: "Select Avatar",
    uploadFile: "Upload File",
    participants: "participants",
    messages: "messages",
    newChat: "New Chat",
    addUser: "Add User",
    bio: "Bio",
    lastSeen: "Last seen",
    fileUploaded: "File uploaded",
    imageUploaded: "Image uploaded",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    selectFromGallery: "Select from Gallery",
    takePhoto: "Take Photo",
    uploadFromDevice: "Upload from Device",
  },
}

export default function Actogram() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDomainAllowed, setIsDomainAllowed] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState<"uz" | "ru" | "en">("uz")
  const [notifications, setNotifications] = useState(true)
  const [userBio, setUserBio] = useState("")
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const t = translations[language]

  // Проверка домена
  useEffect(() => {
    const checkDomain = () => {
      const hostname = window.location.hostname
      const allowedDomains = ["acto-uimuz.vercel.app", "render.com", "vercel.app", "localhost"]
      const isAllowed = allowedDomains.some((domain) => hostname.includes(domain) || hostname === "localhost")
      setIsDomainAllowed(isAllowed)
    }

    checkDomain()
  }, [])

  // Загрузка настроек из localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("actogram_settings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setDarkMode(settings.darkMode || false)
      setLanguage(settings.language || "uz")
      setNotifications(settings.notifications !== false)
    }

    const savedUser = localStorage.getItem("actogram_user")
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setCurrentUser(user)
      setUsername(user.username)
      setUserBio(user.bio || "")
      setIsAuthenticated(true)
    }
  }, [])

  // Применение темной темы
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  // Подключение к серверу
  useEffect(() => {
    if (!isDomainAllowed) return

    const serverUrl = "https://actogr.onrender.com"

    socketRef.current = io(serverUrl, {
      transports: ["websocket", "polling"],
    })

    const socket = socketRef.current

    socket.on("connect", () => {
      console.log("✅ Actogram serveriga ulandi")
      setIsConnected(true)
    })

    socket.on("disconnect", () => {
      console.log("❌ Serverdan uzildi")
      setIsConnected(false)
    })

    socket.on("new_message", (message: Message) => {
      setMessages((prev) => [...prev, message])
      setChats((prev) => prev.map((chat) => (chat.id === message.chatId ? { ...chat, lastMessage: message } : chat)))

      // Звуковое уведомление
      if (notifications && message.senderId !== currentUser?.id) {
        playNotificationSound()
      }
    })

    socket.on("user_joined", (data) => {
      console.log("👋", data.message)
    })

    socket.on("user_left", (data) => {
      console.log("👋", data.message)
    })

    socket.on("users_update", (users: User[]) => {
      setActiveUsers(users)
    })

    socket.on("user_typing", (data) => {
      if (data.chatId === selectedChat?.id) {
        setTypingUsers((prev) => [...prev.filter((u) => u !== data.username), data.username])
      }
    })

    socket.on("user_stop_typing", (data) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.username))
    })

    socket.on("search_results", (results: User[]) => {
      setSearchResults(results)
    })

    return () => {
      socket.disconnect()
    }
  }, [isDomainAllowed, selectedChat?.id, notifications, currentUser?.id])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const playNotificationSound = () => {
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
    )
    audio.volume = 0.3
    audio.play().catch(() => {})
  }

  const saveSettings = () => {
    const settings = { darkMode, language, notifications }
    localStorage.setItem("actogram_settings", JSON.stringify(settings))
  }

  const handleLogin = () => {
    if (!username.trim() || !socketRef.current) return

    const user: User = {
      id: Date.now().toString(),
      username: username.trim(),
      isOnline: true,
      bio: userBio,
    }

    setCurrentUser(user)
    setIsAuthenticated(true)
    localStorage.setItem("actogram_user", JSON.stringify(user))

    socketRef.current.emit("register", user)
    loadChats()
  }

  const loadChats = async () => {
    try {
      const response = await fetch("https://actogr.onrender.com/api/chats")
      if (response.ok) {
        const chatsData = await response.json()
        setChats(chatsData)

        const generalChat = chatsData.find((chat: Chat) => chat.id === "general")
        if (generalChat) {
          selectChat(generalChat)
        }
      }
    } catch (error) {
      console.error("Chatlarni yuklashda xatolik:", error)
      const generalChat: Chat = {
        id: "general",
        name: t.generalChat,
        isGroup: true,
        participants: [],
        unreadCount: 0,
        messageCount: 0,
        type: "group",
      }
      setChats([generalChat])
      selectChat(generalChat)
    }
  }

  const loadMessages = async (chatId: string) => {
    try {
      const response = await fetch(`https://actogr.onrender.com/api/messages/${chatId}`)
      if (response.ok) {
        const messagesData = await response.json()
        setMessages(messagesData)
      }
    } catch (error) {
      console.error("Xabarlarni yuklashda xatolik:", error)
      setMessages([])
    }
  }

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChat || !currentUser || !socketRef.current) return

    const messageData = {
      content: newMessage.trim(),
      chatId: selectedChat.id,
      type: "text",
    }

    socketRef.current.emit("send_message", messageData)
    setNewMessage("")
    socketRef.current.emit("stop_typing", { chatId: selectedChat.id })
  }

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat)
    loadMessages(chat.id)

    if (socketRef.current) {
      socketRef.current.emit("join_chat", chat.id)
    }
  }

  const handleTyping = () => {
    if (selectedChat && socketRef.current) {
      socketRef.current.emit("typing", { chatId: selectedChat.id })

      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit("stop_typing", { chatId: selectedChat.id })
        }
      }, 3000)
    }
  }

  const searchUsers = (query: string) => {
    if (!query.trim() || !socketRef.current) return
    socketRef.current.emit("search_users", query.trim())
  }

  const startPrivateChat = (user: User) => {
    const chatId = `private_${Math.min(Number.parseInt(currentUser!.id), Number.parseInt(user.id))}_${Math.max(Number.parseInt(currentUser!.id), Number.parseInt(user.id))}`

    const existingChat = chats.find((chat) => chat.id === chatId)
    if (existingChat) {
      selectChat(existingChat)
      setShowUserSearch(false)
      return
    }

    const newChat: Chat = {
      id: chatId,
      name: user.username,
      avatar: user.avatar,
      isGroup: false,
      participants: [currentUser!, user],
      unreadCount: 0,
      messageCount: 0,
      type: "private",
    }

    setChats((prev) => [...prev, newChat])
    selectChat(newChat)
    setShowUserSearch(false)

    if (socketRef.current) {
      socketRef.current.emit("create_private_chat", { userId: user.id, chatId })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedChat || !socketRef.current) return

    setUploadingFile(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Симуляция загрузки файла
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const fileUrl = URL.createObjectURL(file)
      const messageData = {
        content: file.name,
        chatId: selectedChat.id,
        type: file.type.startsWith("image/") ? "image" : "file",
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
      }

      socketRef.current.emit("send_message", messageData)
    } catch (error) {
      console.error("Fayl yuklashda xatolik:", error)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser) return

    try {
      const avatarUrl = URL.createObjectURL(file)
      const updatedUser = { ...currentUser, avatar: avatarUrl }

      setCurrentUser(updatedUser)
      localStorage.setItem("actogram_user", JSON.stringify(updatedUser))

      if (socketRef.current) {
        socketRef.current.emit("update_profile", updatedUser)
      }

      setShowAvatarDialog(false)
    } catch (error) {
      console.error("Avatar yuklashda xatolik:", error)
    }
  }

  const updateProfile = () => {
    if (!currentUser) return

    const updatedUser = { ...currentUser, bio: userBio }
    setCurrentUser(updatedUser)
    localStorage.setItem("actogram_user", JSON.stringify(updatedUser))

    if (socketRef.current) {
      socketRef.current.emit("update_profile", updatedUser)
    }
  }

  const filteredChats = chats.filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (!isDomainAllowed) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Kirish taqiqlangan</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Actogram faqat ruxsat etilgan domenlardan foydalanish mumkin</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md animate-in fade-in-50 duration-500">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-400">ACTOGRAM</CardTitle>
            <p className="text-gray-600 dark:text-gray-300">{t.welcome}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500 animate-pulse" />
                  <span className="text-green-500 text-sm">{t.connected}</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-500" />
                  <span className="text-red-500 text-sm">{t.connecting}</span>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t.enterName}</Label>
              <Input
                id="username"
                placeholder={t.enterName}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">{t.bio}</Label>
              <Input
                id="bio"
                placeholder={t.bio}
                value={userBio}
                onChange={(e) => setUserBio(e.target.value)}
                className="transition-all duration-200"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t.language}</Label>
              <div className="flex gap-1">
                {languages.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={language === lang.code ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLanguage(lang.code as "uz" | "ru" | "en")}
                    className="transition-all duration-200"
                  >
                    {lang.flag}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleLogin}
              className="w-full transition-all duration-200 hover:scale-105"
              disabled={!isConnected || !username.trim()}
            >
              {isConnected ? t.login : t.connecting}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`h-screen flex ${darkMode ? "dark" : ""}`}>
      <div className="h-screen flex bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        {/* Боковая панель */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transition-colors duration-200">
          {/* Заголовок */}
          <div className="p-4 border-b dark:border-gray-700 bg-blue-600 dark:bg-blue-700 text-white">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">ACTOGRAM</h1>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-300 animate-pulse" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-300" />
                )}
                <Badge variant="secondary" className="bg-blue-500 dark:bg-blue-600">
                  {currentUser?.username}
                </Badge>
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-blue-700 dark:hover:bg-blue-600">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dark:bg-gray-800">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">{t.settings}</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="profile" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 dark:bg-gray-700">
                        <TabsTrigger value="profile" className="dark:data-[state=active]:bg-gray-600">
                          {t.profile}
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="dark:data-[state=active]:bg-gray-600">
                          {t.settings}
                        </TabsTrigger>
                        <TabsTrigger value="appearance" className="dark:data-[state=active]:bg-gray-600">
                          Appearance
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="profile" className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 cursor-pointer" onClick={() => setShowAvatarDialog(true)}>
                            <AvatarImage src={currentUser?.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="text-lg">{currentUser?.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold dark:text-white">{currentUser?.username}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.online}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio-edit" className="dark:text-white">
                            {t.bio}
                          </Label>
                          <Input
                            id="bio-edit"
                            value={userBio}
                            onChange={(e) => setUserBio(e.target.value)}
                            placeholder={t.bio}
                            className="dark:bg-gray-700 dark:text-white transition-all duration-200"
                          />
                        </div>
                        <Button onClick={updateProfile} className="w-full">
                          {t.save}
                        </Button>
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="dark:text-white">{t.notifications}</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Yangi xabarlar uchun ovozli signal
                            </p>
                          </div>
                          <Switch
                            checked={notifications}
                            onCheckedChange={(checked) => {
                              setNotifications(checked)
                              saveSettings()
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="dark:text-white">{t.language}</Label>
                          <div className="flex gap-2">
                            {languages.map((lang) => (
                              <Button
                                key={lang.code}
                                variant={language === lang.code ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setLanguage(lang.code as "uz" | "ru" | "en")
                                  saveSettings()
                                }}
                                className="transition-all duration-200"
                              >
                                {lang.flag} {lang.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="appearance" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="dark:text-white">{t.darkMode}</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tungi rejimni yoqish</p>
                          </div>
                          <Switch
                            checked={darkMode}
                            onCheckedChange={(checked) => {
                              setDarkMode(checked)
                              saveSettings()
                            }}
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="text-xs text-blue-200 mt-1">
              {t.online}: {activeUsers.length} • {isConnected ? "🟢" : "🔴"}
            </div>
          </div>

          {/* Поиск и кнопки */}
          <div className="p-3 border-b dark:border-gray-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t.searchChats}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-700 dark:text-white transition-all duration-200"
              />
            </div>
            <div className="flex gap-2">
              <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 dark:bg-gray-700 dark:text-white bg-transparent"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t.newChat}
                  </Button>
                </DialogTrigger>
                <DialogContent className="dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="dark:text-white">{t.addUser}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder={t.searchUsers}
                      onChange={(e) => searchUsers(e.target.value)}
                      className="dark:bg-gray-700 dark:text-white"
                    />
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => startPrivateChat(user)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                        >
                          <Avatar>
                            <AvatarImage src={user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{user.username[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="font-medium dark:text-white">{user.username}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.isOnline ? t.online : t.offline}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Список чатов */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => selectChat(chat)}
                className={`p-3 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 ${
                  selectedChat?.id === chat.id ? "bg-blue-50 dark:bg-blue-900 border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="transition-transform duration-200 hover:scale-110">
                    <AvatarImage src={chat.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{chat.isGroup ? <Users className="h-4 w-4" /> : chat.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate dark:text-white">{chat.name}</h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {chat.lastMessage.senderName}: {chat.lastMessage.content}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {chat.messageCount} {t.messages} • {chat.participants.length} {t.participants}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && <Badge className="bg-blue-500 animate-pulse">{chat.unreadCount}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Область чата */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Заголовок чата */}
              <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <Avatar className="transition-transform duration-200 hover:scale-110">
                    <AvatarImage src={selectedChat.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {selectedChat.isGroup ? <Users className="h-4 w-4" /> : selectedChat.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold dark:text-white">{selectedChat.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedChat.isGroup
                        ? `${selectedChat.participants.length} ${t.participants} • ${activeUsers.length} ${t.online}`
                        : isConnected
                          ? t.online
                          : t.offline}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="hover:scale-110 transition-transform duration-200">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:scale-110 transition-transform duration-200">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="hover:scale-110 transition-transform duration-200">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 animate-in fade-in-50 duration-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Hali xabarlar yo'q</p>
                    <p className="text-sm">Birinchi bo'lib yozing!</p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex animate-in slide-in-from-bottom-2 duration-300 ${
                      message.senderId === currentUser?.id ? "justify-end" : "justify-start"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                        message.senderId === currentUser?.id
                          ? "bg-blue-500 text-white"
                          : "bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-white"
                      }`}
                    >
                      {message.senderId !== currentUser?.id && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                          {message.senderName}
                        </p>
                      )}

                      {message.type === "image" && message.fileUrl && (
                        <img
                          src={message.fileUrl || "/placeholder.svg"}
                          alt={message.fileName}
                          className="max-w-full h-auto rounded mb-2 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                          onClick={() => window.open(message.fileUrl, "_blank")}
                        />
                      )}

                      {message.type === "file" && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded">
                          <File className="h-4 w-4" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{message.fileName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : ""}
                            </p>
                          </div>
                        </div>
                      )}

                      <p>{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.senderId === currentUser?.id ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Индикатор печати */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {typingUsers.join(", ")} {t.typing}
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="*/*" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="hover:scale-110 transition-transform duration-200"
                  >
                    {uploadingFile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    placeholder={t.typeMessage}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      if (e.target.value.length === 1) {
                        handleTyping()
                      }
                    }}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 dark:bg-gray-700 dark:text-white transition-all duration-200"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !isConnected}
                    className="hover:scale-110 transition-transform duration-200"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {!isConnected && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{t.disconnected}</p>}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
              <div className="text-center animate-in fade-in-50 duration-500">
                <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">ACTOGRAM'ga xush kelibsiz</h3>
                <p className="text-gray-500 dark:text-gray-400">Suhbatni boshlash uchun chatni tanlang</p>
                <div className="mt-2 text-sm text-gray-400">
                  {isConnected ? "🟢 Serverga ulandi" : "🔴 Server bilan aloqa yo'q"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Avatar Dialog */}
        <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
          <DialogContent className="dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t.selectAvatar}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/*"
              />
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-2 dark:bg-gray-700 dark:text-white"
                >
                  <Upload className="h-4 w-4" />
                  {t.uploadFromDevice}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Мобильная галерея
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = "image/*"
                    input.capture = "environment"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        handleAvatarUpload({ target: { files: [file] } } as any)
                      }
                    }
                    input.click()
                  }}
                  className="flex items-center gap-2 dark:bg-gray-700 dark:text-white"
                >
                  <Camera className="h-4 w-4" />
                  {t.takePhoto}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Галерея
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = "image/*"
                    input.multiple = false
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        handleAvatarUpload({ target: { files: [file] } } as any)
                      }
                    }
                    input.click()
                  }}
                  className="flex items-center gap-2 dark:bg-gray-700 dark:text-white"
                >
                  <ImageIcon className="h-4 w-4" />
                  {t.selectFromGallery}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
