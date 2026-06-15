import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';

const L = {
  surface: '#FFFFFF', card: '#F2EFE9', border: '#E8E3DB', accent: '#B5838D',
  accentSoft: '#F2E8EA', text: '#2D2A2E', muted: '#9B9099'
};

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function useAudioRecorder({ onRecordingComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recordingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      let permission = await Audio.getPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Audio.requestPermissionsAsync();
      }
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Mic access needed.');
        return;
      }
      
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
      
    } catch (err) { 
      console.log("Start Error: ", err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);

    const recording = recordingRef.current;
    if (!recording) return;

    setIsReleasing(true);
    let uri = null;

    try {
      await recording.stopAndUnloadAsync();
    } catch (err) {
      console.log("Stop Error: ", err);
    }

    try {
      uri = recording.getURI();
    } catch (err) {
      console.log("URI Error: ", err);
    }

    // 🚀 Wait for Android to free the memory before showing the Player
    setTimeout(() => {
      recordingRef.current = null;
      setIsReleasing(false);
      if (uri) {
        onRecordingComplete(uri);
      }
    }, 600);

  }, [onRecordingComplete]);

  return { isRecording, isReleasing, elapsed, startRecording, stopRecording };
}

export function MicButton({ onRecordingComplete }) {
  const { isRecording, isReleasing, elapsed, startRecording, stopRecording } = useAudioRecorder({ onRecordingComplete });
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef(null);

  useEffect(() => {
    if (isRecording) {
      pulseOpacity.setValue(0.6);
      pulseLoop.current = Animated.loop(
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 2.2, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 900, useNativeDriver: true })
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseScale.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [isRecording]);

  return (
    <TouchableOpacity
      style={micStyles.wrapper}
      onPress={isRecording ? stopRecording : startRecording}
      activeOpacity={0.8}
      disabled={isReleasing}
    >
      <Animated.View style={[micStyles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
      <View style={[micStyles.btn, isRecording && micStyles.btnRecording, isReleasing && micStyles.btnReleasing]}>
        {isReleasing ? (
          <ActivityIndicator size="small" color={L.accent} />
        ) : (
          <Feather
            name={isRecording ? 'square' : 'mic'}
            size={isRecording ? 14 : 16}
            color={isRecording ? L.accent : L.text}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

// 🚀 LAZY AUDIO PLAYER: Ye crash ko jad se khatam karega.
// Ab file tab tak load nahi hogi jab tak aap 'Play' nahi dabaoge.
function useLazyAudioPlayer(uri) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const togglePlayback = useCallback(async () => {
    if (!uri) return;

    // Agar pehle se load ho chuka hai, toh normal Play/Pause karo
    if (isLoaded && soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
      return;
    }

    // Agar load NAHI hua hai (First Time tap), toh ab aaram se load karo
    setIsLoading(true);
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) { 
            setIsPlaying(false); 
            sound.setPositionAsync(0); 
          }
        }
      });
      soundRef.current = sound;
      setIsLoaded(true);
    } catch (error) {
      console.log("Load Audio Error:", error);
      Alert.alert("Playback Error", "Could not load audio file.");
    }
    setIsLoading(false);
  }, [uri, isLoaded, isPlaying]);

  const seek = useCallback(async (fraction) => {
    if (!soundRef.current || !duration) return;
    await soundRef.current.setPositionAsync(fraction * duration);
  }, [duration]);

  return { isPlaying, position, duration, isLoaded, isLoading, togglePlayback, seek };
}

export function AudioPlaybackPill({ uri, onDelete }) {
  const { isPlaying, position, duration, isLoaded, isLoading, togglePlayback, seek } = useLazyAudioPlayer(uri);
  const slideY = useRef(new Animated.Value(-72)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uri) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, friction: 7, tension: 50, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true })
      ]).start();
    } else {
      Animated.timing(slideY, { toValue: -72, duration: 240, useNativeDriver: true }).start();
    }
  }, [uri]);

  if (!uri) return null;
  const progress = duration > 0 ? position / duration : 0;
  const elapsed = formatDuration(Math.floor(position / 1000));
  const total = formatDuration(Math.floor(duration / 1000));
  const barRef = useRef(null);

  return (
    <Animated.View style={[pillStyles.pill, { transform: [{ translateY: slideY }], opacity }]}>
      <TouchableOpacity style={[pillStyles.playBtn, isPlaying && pillStyles.playBtnActive]} onPress={togglePlayback} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator size="small" color={L.accent} />
        ) : (
          <Feather name={isPlaying ? 'pause' : 'play'} size={14} color={L.accent} />
        )}
      </TouchableOpacity>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={pillStyles.timeRow}>
          <Text style={pillStyles.elapsed}>{elapsed}</Text>
          <Text style={pillStyles.timeSep}>/</Text>
          <Text style={pillStyles.total}>{total}</Text>
          <View style={{ flex: 1 }} />
          <View style={[pillStyles.recDot, isPlaying && pillStyles.recDotActive]} />
          <Text style={pillStyles.audioLabel}>Audio Note</Text>
        </View>
        <TouchableOpacity ref={barRef} activeOpacity={1} onPress={(e) => { barRef.current?.measure((ox, oy, w) => seek(Math.max(0, Math.min(e.nativeEvent.locationX / w, 1)))); }} style={pillStyles.scrubberTrack}>
          <View style={[pillStyles.scrubberFill, { width: `${progress * 100}%` }]} />
          <View style={[pillStyles.scrubberThumb, { left: `${progress * 100}%` }]} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={pillStyles.deleteBtn} onPress={() => Alert.alert('Remove audio', 'Remove this audio note?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: onDelete }])}>
        <Feather name="x" size={12} color={L.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const micStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: L.surface, marginHorizontal: 5 },
  pulseRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: L.accent, top: '50%', alignSelf: 'center', marginTop: -18 },
  btn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EAE6E1', alignItems: 'center', justifyContent: 'center' },
  btnRecording: { backgroundColor: L.accentSoft, borderColor: L.accent },
  btnReleasing: { backgroundColor: L.accentSoft, opacity: 0.7 },
});

const pillStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: L.surface, borderRadius: 18, marginBottom: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 12, borderWidth: 1, borderColor: L.border, shadowColor: L.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: L.card, borderWidth: 1, borderColor: L.border, alignItems: 'center', justifyContent: 'center' },
  playBtnActive: { backgroundColor: L.accentSoft, borderColor: L.accent },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, elapsed: { fontSize: 12, fontWeight: '700', color: L.text }, timeSep: { fontSize: 12, color: L.muted }, total: { fontSize: 12, color: L.muted }, audioLabel: { fontSize: 10, color: L.muted, fontWeight: '600' },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: L.muted }, recDotActive: { backgroundColor: L.accent },
  scrubberTrack: { height: 4, backgroundColor: L.border, borderRadius: 2, position: 'relative' }, scrubberFill: { height: 4, backgroundColor: L.accent, borderRadius: 2, position: 'absolute', left: 0, top: 0 }, scrubberThumb: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: L.accent, marginLeft: -6, shadowColor: L.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 2 },
  deleteBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: L.card, alignItems: 'center', justifyContent: 'center' },
});
                                                                 
