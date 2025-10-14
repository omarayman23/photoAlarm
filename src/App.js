import React, { useState, useEffect, useRef } from 'react';
import { Camera, Clock, Plus, Trash2, LogOut, Bell } from 'lucide-react';

// Backend API with persistent storage
const mockBackend = {
  STORAGE_KEY: 'photoAlarmData',
  
  getData() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { users: [], currentUserId: null };
  },
  
  saveData(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },
  
  register(email, password) {
    const data = this.getData();
    const existing = data.users.find(u => u.email === email);
    if (existing) throw new Error('User already exists');
    
    const user = {
      id: Date.now(),
      email,
      password,
      alarms: []
    };
    data.users.push(user);
    data.currentUserId = user.id;
    this.saveData(data);
    return user;
  },
  
  login(email, password) {
    const data = this.getData();
    const user = data.users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid credentials');
    data.currentUserId = user.id;
    this.saveData(data);
    return user;
  },
  
  logout() {
    const data = this.getData();
    data.currentUserId = null;
    this.saveData(data);
  },
  
  getCurrentUser() {
    const data = this.getData();
    if (!data.currentUserId) return null;
    return data.users.find(u => u.id === data.currentUserId);
  },
  
  addAlarm(alarm) {
    const data = this.getData();
    const user = data.users.find(u => u.id === data.currentUserId);
    if (!user) throw new Error('Not authenticated');
    
    alarm.id = Date.now();
    user.alarms.push(alarm);
    this.saveData(data);
    return alarm;
  },
  
  deleteAlarm(alarmId) {
    const data = this.getData();
    const user = data.users.find(u => u.id === data.currentUserId);
    if (!user) throw new Error('Not authenticated');
    
    user.alarms = user.alarms.filter(a => a.id !== alarmId);
    this.saveData(data);
  },
  
  getAlarms() {
    const user = this.getCurrentUser();
    return user ? user.alarms : [];
  }
};

export default function PhotoAlarmApp() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [alarms, setAlarms] = useState([]);
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    hour: '12',
    minute: '00',
    period: 'AM',
    sound: 'default'
  });
  
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Check for existing session on mount
  useEffect(() => {
    const currentUser = mockBackend.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setAlarms(mockBackend.getAlarms());
      setShowAuth(false);
    }
  }, []);

  // Check alarms every second
  useEffect(() => {
    if (user && !activeAlarm) {
      checkIntervalRef.current = setInterval(() => {
        const now = new Date();
        const currentTime = formatTime(now);
        
        alarms.forEach(alarm => {
          const alarmTime = `${alarm.hour}:${alarm.minute} ${alarm.period}`;
          if (currentTime === alarmTime) {
            triggerAlarm(alarm);
          }
        });
      }, 1000);
    }
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, alarms, activeAlarm]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  };

  const handleAuth = () => {
    setAuthError('');
    
    try {
      if (isLogin) {
        const userData = mockBackend.login(email, password);
        setUser(userData);
        setAlarms(mockBackend.getAlarms());
      } else {
        const userData = mockBackend.register(email, password);
        setUser(userData);
        setAlarms([]);
      }
      setShowAuth(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    mockBackend.logout();
    setUser(null);
    setAlarms([]);
    setShowAuth(true);
    if (activeAlarm) stopAlarm();
  };

  const handleAddAlarm = () => {
    try {
      const alarm = mockBackend.addAlarm({ ...newAlarm, enabled: true });
      setAlarms([...alarms, alarm]);
      setShowAddAlarm(false);
      setNewAlarm({ hour: '12', minute: '00', period: 'AM', sound: 'default' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteAlarm = (alarmId) => {
    try {
      mockBackend.deleteAlarm(alarmId);
      setAlarms(alarms.filter(a => a.id !== alarmId));
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerAlarm = (alarm) => {
    setActiveAlarm(alarm);
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const stopAlarm = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setActiveAlarm(null);
    setShowCamera(false);
    setCameraError('');
  };

  const startCamera = async () => {
    setCameraError('');
    setShowCamera(true);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera access denied. Please allow camera access in your browser settings.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError('Camera not ready. Please try again.');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is playing
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setCameraError('Video is loading. Please wait a moment and try again.');
      return;
    }
    
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Successfully captured - dismiss alarm
      stopAlarm();
    } catch (err) {
      console.error('Capture error:', err);
      setCameraError('Failed to capture photo. Please try again.');
    }
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Camera className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Photo Alarm</h1>
            <p className="text-gray-600 mt-2">Wake up with a selfie!</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            
            {authError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {authError}
              </div>
            )}
            
            <button
              onClick={handleAuth}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              {isLogin ? 'Log In' : 'Sign Up'}
            </button>
            
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-indigo-600 text-sm hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <audio ref={audioRef} loop>
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUA0PVqzn77BdGAg+ltryxnMlBSuAzvLZjToIGWi77eifTBAMUKXj8LljHAY4kdfyzHksBSR3x/DdkEEKFF60p+uoVRQKRp/g8r5sIQUxh9Hz04IzBh5uwO/jmVAND1as5++wXRgIPpba8sZzJQUrj8/y2Yw6CBlouu3on04QDFCl4/C5YxwGOJHX8sx5LAUkd8fw3ZBBChRet" type="audio/wav" />
      </audio>
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-3 rounded-full">
              <Camera className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Photo Alarm</h1>
              <p className="text-indigo-100 text-sm">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {activeAlarm && !showCamera && (
          <div className="bg-red-500 text-white p-8 rounded-2xl shadow-2xl mb-6 animate-pulse">
            <div className="text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 animate-bounce" />
              <h2 className="text-3xl font-bold mb-2">ALARM!</h2>
              <p className="text-xl mb-6">{activeAlarm.hour}:{activeAlarm.minute} {activeAlarm.period}</p>
              <button
                onClick={startCamera}
                className="bg-white text-red-500 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
              >
                Take Photo to Dismiss
              </button>
            </div>
          </div>
        )}

        {showCamera && (
          <div className="bg-white p-6 rounded-2xl shadow-2xl mb-6">
            <h3 className="text-xl font-bold mb-4 text-center text-gray-800">Take a selfie to dismiss alarm</h3>
            
            {cameraError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {cameraError}
              </div>
            )}
            
            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
                style={{ maxHeight: '400px' }}
              />
            </div>
            
            <button
              onClick={capturePhoto}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
            >
              <Camera className="w-5 h-5" />
              <span>Capture Photo & Dismiss Alarm</span>
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">My Alarms</h2>
            <button
              onClick={() => setShowAddAlarm(!showAddAlarm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add Alarm</span>
            </button>
          </div>

          {showAddAlarm && (
            <div className="bg-gray-50 p-6 rounded-xl mb-6">
              <h3 className="font-semibold mb-4 text-gray-800">New Alarm</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hour</label>
                  <select
                    value={newAlarm.hour}
                    onChange={(e) => setNewAlarm({ ...newAlarm, hour: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minute</label>
                  <select
                    value={newAlarm.minute}
                    onChange={(e) => setNewAlarm({ ...newAlarm, minute: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[...Array(60)].map((_, i) => (
                      <option key={i} value={String(i).padStart(2, '0')}>
                        {String(i).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">AM/PM</label>
                  <select
                    value={newAlarm.period}
                    onChange={(e) => setNewAlarm({ ...newAlarm, period: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sound</label>
                <select
                  value={newAlarm.sound}
                  onChange={(e) => setNewAlarm({ ...newAlarm, sound: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="default">Default</option>
                  <option value="beep">Beep</option>
                  <option value="chime">Chime</option>
                </select>
              </div>
              <button
                onClick={handleAddAlarm}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Save Alarm
              </button>
            </div>
          )}

          {alarms.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No alarms set</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center space-x-4">
                    <Clock className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {alarm.hour}:{alarm.minute} {alarm.period}
                      </p>
                      <p className="text-sm text-gray-500">Sound: {alarm.sound}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAlarm(alarm.id)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white/20 backdrop-blur-sm p-4 rounded-lg">
          <p className="text-white text-sm text-center">
            💡 Tip: When your alarm goes off, you must take a selfie to dismiss it!
          </p>
        </div>
      </div>
    </div>
  );
}