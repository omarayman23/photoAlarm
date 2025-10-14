import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Trash2, Plus, X, Bell, LogOut, Users } from 'lucide-react';

export default function AlarmApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [signupData, setSignupData] = useState({ username: '', age: '', email: '', password: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [alarmData, setAlarmData] = useState({ time: '', label: '' });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const alarmCheckIntervalRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentUser && alarms.length > 0) {
      alarmCheckIntervalRef.current = setInterval(() => {
        checkAlarms();
      }, 1000);
    }
    return () => {
      if (alarmCheckIntervalRef.current) {
        clearInterval(alarmCheckIntervalRef.current);
      }
    };
  }, [currentUser, alarms]);

  const checkAlarms = () => {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    alarms.forEach(alarm => {
      if (alarm.time === currentTimeStr && alarm.userId === currentUser?.id && !alarm.dismissed) {
        if (!activeAlarm || activeAlarm.id !== alarm.id) {
          triggerAlarm(alarm);
        }
      }
    });
  };

  const triggerAlarm = (alarm) => {
    setActiveAlarm(alarm);
    playAlarmSound();
  };

  const playAlarmSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    
    let beepCount = 0;
    const beepInterval = setInterval(() => {
      if (beepCount < 10) {
        oscillator.frequency.value = beepCount % 2 === 0 ? 800 : 600;
        beepCount++;
      } else {
        oscillator.stop();
        clearInterval(beepInterval);
      }
    }, 300);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSignup = () => {
    const { username, age, email, password } = signupData;

    if (!username || !age || !email || !password) {
      alert('All fields are required!');
      return;
    }

    if (!validateEmail(email)) {
      alert('Please enter a valid email address!');
      return;
    }

    const ageNum = parseInt(age);
    if (ageNum < 13 || ageNum > 120) {
      alert('Please enter a valid age!');
      return;
    }

    if (users.find(u => u.email === email)) {
      alert('Email already registered!');
      return;
    }

    const newUser = {
      id: Date.now(),
      username,
      age: ageNum,
      email,
      password,
      loginCount: 1,
      lastLogin: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setCurrentUser(newUser);
    setShowSignup(false);
    setShowLogin(false);
    setSignupData({ username: '', age: '', email: '', password: '' });
  };

  const handleLogin = () => {
    const { email, password } = loginData;

    if (!validateEmail(email)) {
      alert('Please enter a valid email address!');
      return;
    }

    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      const updatedUser = {
        ...user,
        loginCount: user.loginCount + 1,
        lastLogin: new Date().toISOString()
      };
      const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
      setUsers(updatedUsers);
      setCurrentUser(updatedUser);
      setShowLogin(false);
      setLoginData({ email: '', password: '' });
    } else {
      alert('Invalid email or password!');
    }
  };

  const handleAddAlarm = () => {
    const { time, label } = alarmData;

    if (!time) {
      alert('Please select a time!');
      return;
    }

    const newAlarm = {
      id: Date.now(),
      userId: currentUser.id,
      time,
      label: label || 'Alarm',
      dismissed: false
    };

    setAlarms([...alarms, newAlarm]);
    setAlarmData({ time: '', label: '' });
  };

  const handleDeleteAlarm = (alarmId) => {
    setAlarms(alarms.filter(a => a.id !== alarmId));
    if (activeAlarm?.id === alarmId) {
      setActiveAlarm(null);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      alert('Camera access denied. Please enable camera permissions.');
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      stopCamera();
      dismissAlarm();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        dismissAlarm();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setShowVoiceRecorder(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 4) {
            stopVoiceRecording();
            return 5;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setShowVoiceRecorder(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const dismissAlarm = () => {
    if (activeAlarm) {
      setAlarms(alarms.map(a => 
        a.id === activeAlarm.id ? { ...a, dismissed: true } : a
      ));
    }
    setActiveAlarm(null);
    setShowCamera(false);
    setShowVoiceRecorder(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAlarms([]);
    setActiveAlarm(null);
    setShowLogin(true);
  };

  const getUserAlarms = () => {
    return alarms.filter(a => a.userId === currentUser?.id);
  };

  if (showLogin || showSignup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Bell className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Alarm Clock Pro</h1>
            <p className="text-gray-600 mt-2">Wake up verified with photo or voice</p>
          </div>

          {showSignup ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={signupData.username}
                  onChange={(e) => setSignupData({...signupData, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  value={signupData.age}
                  onChange={(e) => setSignupData({...signupData, age: e.target.value})}
                  min="13"
                  max="120"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter age"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter password (min 6 characters)"
                />
              </div>
              <button
                onClick={handleSignup}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Sign Up
              </button>
              <button
                onClick={() => { setShowSignup(false); setShowLogin(true); }}
                className="w-full text-indigo-600 py-2 text-sm hover:underline"
              >
                Already have an account? Log in
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter password"
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Log In
              </button>
              <button
                onClick={() => { setShowLogin(false); setShowSignup(true); }}
                className="w-full text-indigo-600 py-2 text-sm hover:underline"
              >
                Don't have an account? Sign up
              </button>
            </div>
          )}

          {users.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center text-gray-600 text-sm">
                <Users className="w-4 h-4 mr-2" />
                <span>{users.length} total users • {users.reduce((sum, u) => sum + u.loginCount, 0)} total logins</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome, {currentUser.username}!</h1>
              <p className="text-gray-600 mt-1">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-sm text-gray-500 mt-1">Login #{currentUser.loginCount}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Alarm</h2>
          <div className="flex gap-4">
            <input
              type="time"
              value={alarmData.time}
              onChange={(e) => setAlarmData({...alarmData, time: e.target.value})}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              type="text"
              value={alarmData.label}
              onChange={(e) => setAlarmData({...alarmData, label: e.target.value})}
              placeholder="Alarm label (optional)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleAddAlarm}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Alarms</h2>
          {getUserAlarms().length === 0 ? (
            <p className="text-gray-500 text-center py-8">No alarms set yet. Add one above!</p>
          ) : (
            <div className="space-y-3">
              {getUserAlarms().map(alarm => (
                <div
                  key={alarm.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    alarm.dismissed ? 'bg-gray-100 border-gray-300' : 'bg-indigo-50 border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Bell className={`w-6 h-6 ${alarm.dismissed ? 'text-gray-400' : 'text-indigo-600'}`} />
                    <div>
                      <p className={`text-2xl font-bold ${alarm.dismissed ? 'text-gray-500' : 'text-gray-800'}`}>
                        {alarm.time}
                      </p>
                      <p className={`text-sm ${alarm.dismissed ? 'text-gray-400' : 'text-gray-600'}`}>
                        {alarm.label} {alarm.dismissed && '(Dismissed)'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAlarm(alarm.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {activeAlarm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-pulse">
              <div className="text-center mb-6">
                <Bell className="w-20 h-20 mx-auto mb-4 text-red-500 animate-bounce" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">ALARM!</h2>
                <p className="text-xl text-gray-600">{activeAlarm.label}</p>
                <p className="text-4xl font-bold text-indigo-600 mt-4">{activeAlarm.time}</p>
              </div>

              {!showCamera && !showVoiceRecorder && (
                <div className="space-y-3">
                  <button
                    onClick={startCamera}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition text-lg"
                  >
                    <Camera className="w-6 h-6" />
                    Take Photo to Dismiss
                  </button>
                  <button
                    onClick={startVoiceRecording}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition text-lg"
                  >
                    <Mic className="w-6 h-6" />
                    Record Voice (5s)
                  </button>
                </div>
              )}

              {showCamera && (
                <div className="space-y-4">
                  <video ref={videoRef} autoPlay className="w-full rounded-lg" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-3">
                    <button
                      onClick={takePhoto}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      Capture Photo
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {showVoiceRecorder && (
                <div className="text-center space-y-4">
                  <div className="relative">
                    <Mic className={`w-20 h-20 mx-auto ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                    <div className="text-4xl font-bold text-indigo-600 mt-4">
                      {recordingTime}s / 5s
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${(recordingTime / 5) * 100}%` }}
                    />
                  </div>
                  {isRecording && (
                    <button
                      onClick={stopVoiceRecording}
                      className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      Stop Recording
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
