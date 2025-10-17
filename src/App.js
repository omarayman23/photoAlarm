import React, { useState, useEffect, useRef } from 'react';
import { Camera, Clock, Plus, Trash2, LogOut, Bell, Lightbulb, CheckSquare, Moon, Sun, Mic } from 'lucide-react';

// Alarm sounds with proper audio data
const ALARM_SOUNDS = {
  classic: {
    name: 'Classic Beep',
    frequency: 800,
    duration: 0.3,
    gap: 0.2
  },
  urgent: {
    name: 'Urgent',
    frequency: 1000,
    duration: 0.2,
    gap: 0.1
  },
  gentle: {
    name: 'Gentle Wake',
    frequency: 600,
    duration: 0.5,
    gap: 0.3
  },
  radar: {
    name: 'Radar',
    frequency: 440,
    duration: 0.1,
    gap: 0.05
  }
};

// Improved backend with proper localStorage persistence
const storage = {
  USERS_KEY: 'photoAlarm_users',
  SESSION_KEY: 'photoAlarm_session',
  
  getUsers() {
    try {
      const data = localStorage.getItem(this.USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading users:', e);
      return [];
    }
  },
  
  saveUsers(users) {
    try {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users:', e);
    }
  },
  
  getSession() {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  
  saveSession(userId) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify({ userId, timestamp: Date.now() }));
  },
  
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },
  
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  register(email, password, username, age) {
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    const users = this.getUsers();
    if (users.find(u => u.email === email)) {
      throw new Error('Email already exists');
    }
    if (users.find(u => u.username === username)) {
      throw new Error('Username already taken');
    }
    
    if (age < 13 || age > 120) {
      throw new Error('Invalid age');
    }
    
    const newUser = {
      id: Date.now() + Math.random(),
      email,
      password,
      username,
      age,
      alarms: [],
      brainstorm: [],
      todos: [],
      theme: 'light',
      createdAt: Date.now()
    };
    
    users.push(newUser);
    this.saveUsers(users);
    this.saveSession(newUser.id);
    return newUser;
  },
  
  login(email, password) {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    this.saveSession(user.id);
    return user;
  },
  
  logout() {
    this.clearSession();
  },
  
  getCurrentUser() {
    const session = this.getSession();
    if (!session) return null;
    
    const users = this.getUsers();
    return users.find(u => u.id === session.userId) || null;
  },
  
  updateUser(userId, updates) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found');
    
    users[index] = { ...users[index], ...updates };
    this.saveUsers(users);
    return users[index];
  },
  
  addAlarm(userId, alarm) {
    const user = this.getCurrentUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');
    
    alarm.id = Date.now() + Math.random();
    const updatedAlarms = [...user.alarms, alarm];
    return this.updateUser(userId, { alarms: updatedAlarms });
  },
  
  deleteAlarm(userId, alarmId) {
    const user = this.getCurrentUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');
    
    const updatedAlarms = user.alarms.filter(a => a.id !== alarmId);
    return this.updateUser(userId, { alarms: updatedAlarms });
  },
  
  addBrainstorm(userId, text) {
    const user = this.getCurrentUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');
    
    const note = { id: Date.now() + Math.random(), text, timestamp: Date.now() };
    const updatedBrainstorm = [...user.brainstorm, note];
    return this.updateUser(userId, { brainstorm: updatedBrainstorm });
  },
  
  deleteBrainstorm(userId, noteId) {
    const user = this.getCurrentUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');
    
    const updatedBrainstorm = user.brainstorm.filter(n => n.id !== noteId);
    return this.updateUser(userId, { brainstorm: updatedBrainstorm });
  },
  
  addTodo(userId, text) {
    const user = this.getCurrentUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');
    
    const todo = { id: Date.now() + Math.random(), text, completed: false, timestamp: Date.now() };
    const updatedTodos = [...user.todos, todo];
    return this.updateUser(userId, { todos: updatedTodos });
  },
  
  toggleTodo(userId, todoId) {
    const user = this.getCurrentUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');
    
    const updatedTodos = user.todos.map(t => 
      t.id === todoId ? { ...t, completed: !t.completed } : t
    );
    return this.updateUser(userId, { todos: updatedTodos });
  },
  
  deleteTodo(userId, todoId) {
    const user = this.getCurrentUser();
    if (!user || user.id !== userId) throw new Error('Not authenticated');
    
    const updatedTodos = user.todos.filter(t => t.id !== todoId);
    return this.updateUser(userId, { todos: updatedTodos });
  },
  
  setTheme(userId, theme) {
    return this.updateUser(userId, { theme });
  }
};

export default function PhotoAlarmApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [currentTab, setCurrentTab] = useState('alarms');
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    hour: '12',
    minute: '00',
    period: 'AM',
    sound: 'classic'
  });
  
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [verificationMethod, setVerificationMethod] = useState(null); // 'photo' or 'audio'
  const [showCamera, setShowCamera] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [verificationError, setVerificationError] = useState('');
  const [stream, setStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  
  const [brainstormText, setBrainstormText] = useState('');
  const [todoText, setTodoText] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Splash screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      const currentUser = storage.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        setShowAuth(true);
      }
    }, 2500);
    
    return () => clearTimeout(timer);
  }, []);

  // Check for existing session
  useEffect(() => {
    if (!showSplash && !user) {
      const currentUser = storage.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    }
  }, [showSplash, user]);

  // Check alarms every second
  useEffect(() => {
    if (user && !activeAlarm) {
      checkIntervalRef.current = setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        user.alarms.forEach(alarm => {
          let alarmHour = parseInt(alarm.hour);
          if (alarm.period === 'PM' && alarmHour !== 12) alarmHour += 12;
          if (alarm.period === 'AM' && alarmHour === 12) alarmHour = 0;
          
          const alarmMinute = parseInt(alarm.minute);
          
          if (hours === alarmHour && minutes === alarmMinute && seconds === 0) {
            triggerAlarm(alarm);
          }
        });
      }, 1000);
    }
    
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [user, activeAlarm]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      stopAlarmSound();
    };
  }, [stream, audioStream]);

  const playAlarmSound = (soundType) => {
    if (!audioContextRef.current) return;
    
    const sound = ALARM_SOUNDS[soundType] || ALARM_SOUNDS.classic;
    const audioContext = audioContextRef.current;
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const playBeep = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = sound.frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + sound.duration);
    };
    
    playBeep();
    
    alarmIntervalRef.current = setInterval(() => {
      playBeep();
    }, (sound.duration + sound.gap) * 1000);
  };

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  const handleAuth = () => {
    setAuthError('');
    try {
      const userData = isLogin 
        ? storage.login(email, password)
        : storage.register(email, password, username, parseInt(age));
      setUser(userData);
      setShowAuth(false);
      setEmail('');
      setPassword('');
      setUsername('');
      setAge('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    storage.logout();
    setUser(null);
    setShowAuth(true);
    setCurrentTab('alarms');
    if (activeAlarm) stopAlarm();
  };

  const toggleTheme = () => {
    const newTheme = user.theme === 'light' ? 'dark' : 'light';
    const updated = storage.setTheme(user.id, newTheme);
    setUser(updated);
  };

  const handleAddAlarm = () => {
    const updated = storage.addAlarm(user.id, { ...newAlarm, enabled: true });
    setUser(updated);
    setShowAddAlarm(false);
    setNewAlarm({ hour: '12', minute: '00', period: 'AM', sound: 'classic' });
  };

  const handleDeleteAlarm = (alarmId) => {
    const updated = storage.deleteAlarm(user.id, alarmId);
    setUser(updated);
  };

  const handleAddBrainstorm = () => {
    if (!brainstormText.trim()) return;
    const updated = storage.addBrainstorm(user.id, brainstormText);
    setUser(updated);
    setBrainstormText('');
  };

  const handleDeleteBrainstorm = (noteId) => {
    const updated = storage.deleteBrainstorm(user.id, noteId);
    setUser(updated);
  };

  const handleAddTodo = () => {
    if (!todoText.trim()) return;
    const updated = storage.addTodo(user.id, todoText);
    setUser(updated);
    setTodoText('');
  };

  const handleToggleTodo = (todoId) => {
    const updated = storage.toggleTodo(user.id, todoId);
    setUser(updated);
  };

  const handleDeleteTodo = (todoId) => {
    const updated = storage.deleteTodo(user.id, todoId);
    setUser(updated);
  };

  const triggerAlarm = (alarm) => {
    console.log('Triggering alarm:', alarm);
    setActiveAlarm(alarm);
    setVerificationMethod(null);
    playAlarmSound(alarm.sound);
  };

  const stopAlarm = () => {
    console.log('Stopping alarm');
    stopAlarmSound();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setActiveAlarm(null);
    setVerificationMethod(null);
    setShowCamera(false);
    setShowAudioRecorder(false);
    setIsRecording(false);
    setRecordingTime(0);
    setVerificationError('');
  };

  const choosePhotoVerification = async () => {
    console.log('Photo verification chosen');
    setVerificationMethod('photo');
    setVerificationError('');
    
    try {
      console.log('Requesting camera access...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      console.log('Camera access granted');
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait a bit for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, playing...');
            videoRef.current.play().catch(e => console.error('Video play error:', e));
          };
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      setVerificationError('Camera access denied. Try the audio option or check browser permissions.');
      setShowCamera(false);
      setVerificationMethod(null);
    }
  };

  const chooseAudioVerification = async () => {
    setVerificationMethod('audio');
    setVerificationError('');
    setShowAudioRecorder(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(mediaStream);
      
      mediaRecorderRef.current = new MediaRecorder(mediaStream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped, dismissing alarm');
        stopAlarm();
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer for 5 seconds
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 4) {
            // Stop recording after 5 seconds
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);
            return 5;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Microphone error:', err);
      setVerificationError('Microphone access denied. Please allow microphone access in browser settings.');
      setShowAudioRecorder(false);
      setVerificationMethod(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setVerificationError('Camera not ready. Please wait a moment.');
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setVerificationError('Video loading, please wait...');
      return;
    }
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      
      console.log('Photo captured successfully');
      stopAlarm();
    } catch (err) {
      console.error('Capture error:', err);
      setVerificationError('Failed to capture photo. Please try again.');
    }
  };

  const isDark = user?.theme === 'dark';
  const bg = isDark ? 'bg-black' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-black';
  const border = isDark ? 'border-gray-700' : 'border-gray-300';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const inputBg = isDark ? 'bg-gray-800' : 'bg-white';

  if (showSplash) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <h1 className={`text-6xl font-bold ${text} animate-pulse`}>PhotoAlarm</h1>
      </div>
    );
  }

  if (showAuth) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className={`${cardBg} rounded-2xl shadow-2xl p-8 w-full max-w-md border ${border}`}>
          <div className="text-center mb-8">
            <h2 className={`text-3xl font-bold ${text}`}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          </div>
          <div className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className={`block text-sm font-medium ${text} mb-2`}>Username</label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full px-4 py-3 ${inputBg} ${text} border ${border} rounded-lg focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${text} mb-2`}>Age</label>
                  <input
                    type="number"
                    placeholder="Age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="13"
                    max="120"
                    className={`w-full px-4 py-3 ${inputBg} ${text} border ${border} rounded-lg focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
              </>
            )}
            <div>
              <label className={`block text-sm font-medium ${text} mb-2`}>Email</label>
              <input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 ${inputBg} ${text} border ${border} rounded-lg focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${text} mb-2`}>Password</label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className={`w-full px-4 py-3 ${inputBg} ${text} border ${border} rounded-lg focus:ring-2 focus:ring-blue-500`}
                required
              />
            </div>
            {authError && <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm">{authError}</div>}
            <button onClick={handleAuth} className={`w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700`}>
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>
            <button onClick={() => setIsLogin(!isLogin)} className="w-full text-blue-600 text-sm hover:underline">
              {isLogin ? 'Create new account' : 'Already have an account?'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <canvas ref={canvasRef} className="hidden" />
      
      {activeAlarm && (
        <div className="fixed inset-0 bg-red-600 z-50 flex items-center justify-center p-4">
          <div className="text-white text-center max-w-2xl w-full">
            {!verificationMethod ? (
              <>
                <Bell className="w-24 h-24 mx-auto mb-6 animate-bounce" />
                <h2 className="text-5xl font-bold mb-4 animate-pulse">ALARM!</h2>
                <p className="text-3xl mb-8">{activeAlarm.hour}:{activeAlarm.minute} {activeAlarm.period}</p>
                <div className="space-y-4">
                  <button 
                    onClick={choosePhotoVerification} 
                    className="w-full bg-white text-red-600 px-12 py-6 rounded-xl font-bold text-2xl hover:bg-gray-100 transition shadow-2xl flex items-center justify-center space-x-4"
                  >
                    <Camera className="w-8 h-8" />
                    <span>Take Photo to Dismiss</span>
                  </button>
                  <button 
                    onClick={chooseAudioVerification} 
                    className="w-full bg-white text-red-600 px-12 py-6 rounded-xl font-bold text-2xl hover:bg-gray-100 transition shadow-2xl flex items-center justify-center space-x-4"
                  >
                    <Mic className="w-8 h-8" />
                    <span>Record 5sec Audio to Dismiss</span>
                  </button>
                </div>
              </>
            ) : verificationMethod === 'photo' && showCamera ? (
              <div className="bg-white rounded-2xl p-6 text-black">
                <h3 className="text-2xl font-bold mb-4">Take a selfie to stop the alarm</h3>
                {verificationError && (
                  <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">
                    {verificationError}
                  </div>
                )}
                <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full" 
                    style={{ maxHeight: '500px' }} 
                  />
                </div>
                <button 
                  onClick={capturePhoto} 
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-xl hover:bg-blue-700 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <Camera className="w-6 h-6" />
                  <span>Capture Photo & Stop Alarm</span>
                </button>
              </div>
            ) : verificationMethod === 'audio' && showAudioRecorder ? (
              <div className="bg-white rounded-2xl p-6 text-black">
                <h3 className="text-2xl font-bold mb-4">Recording audio...</h3>
                {verificationError && (
                  <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">
                    {verificationError}
                  </div>
                )}
                <div className="flex flex-col items-center justify-center py-12">
                  <Mic className={`w-32 h-32 mb-6 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                  <p className="text-4xl font-bold mb-4">{recordingTime} / 5</p>
                  <p className="text-xl text-gray-600">
                    {isRecording ? 'Recording in progress...' : 'Processing...'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-8 pt-4">
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${text} opacity-70`}>@{user?.username}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={toggleTheme} className={`p-2 ${cardBg} rounded-lg border ${border}`}>
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className={`px-4 py-2 ${cardBg} rounded-lg border ${border} hover:opacity-80`}>
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`flex space-x-2 mb-6 border-b ${border}`}>
          {['alarms', 'brainstorm', 'todos'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`px-6 py-3 font-semibold capitalize ${currentTab === tab ? `border-b-2 border-blue-600 ${text}` : `${text} opacity-50`}`}
            >
              {tab === 'alarms' && <Clock className="w-5 h-5 inline mr-2" />}
              {tab === 'brainstorm' && <Lightbulb className="w-5 h-5 inline mr-2" />}
              {tab === 'todos' && <CheckSquare className="w-5 h-5 inline mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        {currentTab === 'alarms' && (
          <div className={`${cardBg} rounded-2xl p-6 border ${border}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Alarms</h2>
              <button onClick={() => setShowAddAlarm(!showAddAlarm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700">
                <Plus className="w-5 h-5" />
                <span>Add</span>
              </button>
            </div>

            {showAddAlarm && (
              <div className={`${inputBg} p-6 rounded-xl mb-6 border ${border}`}>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={`block text-sm font-medium ${text} mb-2`}>Hour</label>
                    <select value={newAlarm.hour} onChange={(e) => setNewAlarm({ ...newAlarm, hour: e.target.value })} className={`w-full px-3 py-2 ${inputBg} ${text} border ${border} rounded-lg`}>
                      {[...Array(12)].map((_, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${text} mb-2`}>Minute</label>
                    <select value={newAlarm.minute} onChange={(e) => setNewAlarm({ ...newAlarm, minute: e.target.value })} className={`w-full px-3 py-2 ${inputBg} ${text} border ${border} rounded-lg`}>
                      {[...Array(60)].map((_, i) => <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${text} mb-2`}>AM/PM</label>
                    <select value={newAlarm.period} onChange={(e) => setNewAlarm({ ...newAlarm, period: e.target.value })} className={`w-full px-3 py-2 ${inputBg} ${text} border ${border} rounded-lg`}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className={`block text-sm font-medium ${text} mb-2`}>Ringtone</label>
                  <select value={newAlarm.sound} onChange={(e) => setNewAlarm({ ...newAlarm, sound: e.target.value })} className={`w-full px-3 py-2 ${inputBg} ${text} border ${border} rounded-lg`}>
                    {Object.entries(ALARM_SOUNDS).map(([key, sound]) => (
                      <option key={key} value={key}>{sound.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleAddAlarm} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Save Alarm</button>
              </div>
            )}

            {user.alarms.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <Clock className="w-16 h-16 mx-auto mb-4" />
                <p>No alarms set</p>
              </div>
            ) : (
              <div className="space-y-3">
                {user.alarms.map((alarm) => (
                  <div key={alarm.id} className={`flex items-center justify-between p-4 ${inputBg} rounded-lg border ${border}`}>
                    <div className="flex items-center space-x-4">
                      <Clock className="w-6 h-6" />
                      <div>
                        <p className="text-2xl font-bold">{alarm.hour}:{alarm.minute} {alarm.period}</p>
                        <p className="text-sm opacity-70">{ALARM_SOUNDS[alarm.sound]?.name || 'Classic Beep'}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAlarm(alarm.id)} className="text-red-500 p-2 hover:bg-red-50 rounded">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentTab === 'brainstorm' && (
          <div className={`${cardBg} rounded-2xl p-6 border ${border}`}>
            <h2 className="text-2xl font-bold mb-6">Brainstorm</h2>
            <div className="mb-6">
              <textarea
                value={brainstormText}
                onChange={(e) => setBrainstormText(e.target.value)}
                placeholder="Write down your dreams, thoughts, ideas..."
                className={`w-full px-4 py-3 ${inputBg} ${text} border ${border} rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500`}
              />
              <button onClick={handleAddBrainstorm} className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Add Note</button>
            </div>
            <div className="space-y-3">
              {user.brainstorm.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <Lightbulb className="w-16 h-16 mx-auto mb-4" />
                  <p>No notes yet</p>
                </div>
              ) : (
                user.brainstorm.map((note) => (
                  <div key={note.id} className={`p-4 ${inputBg} rounded-lg border ${border} flex justify-between items-start`}>
                    <p className="flex-1">{note.text}</p>
                    <button onClick={() => handleDeleteBrainstorm(note.id)} className="text-red-500 ml-4 hover:bg-red-50 p-2 rounded">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {currentTab === 'todos' && (
          <div className={`${cardBg} rounded-2xl p-6 border ${border}`}>
            <h2 className="text-2xl font-bold mb-6">To-Do List</h2>
            <div className="mb-6">
              <input
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
                placeholder="Add a task..."
                className={`w-full px-4 py-3 ${inputBg} ${text} border ${border} rounded-lg focus:ring-2 focus:ring-blue-500`}
              />
              <button onClick={handleAddTodo} className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">Add Task</button>
            </div>
            <div className="space-y-3">
              {user.todos.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <CheckSquare className="w-16 h-16 mx-auto mb-4" />
                  <p>No tasks yet</p>
                </div>
              ) : (
                user.todos.map((todo) => (
                  <div key={todo.id} className={`p-4 ${inputBg} rounded-lg border ${border} flex items-center justify-between`}>
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleTodo(todo.id)}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <p className={todo.completed ? 'line-through opacity-50' : ''}>{todo.text}</p>
                    </div>
                    <button onClick={() => handleDeleteTodo(todo.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
