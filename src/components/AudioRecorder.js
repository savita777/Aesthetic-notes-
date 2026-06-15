import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Feather } from '@expo/vector-icons';

const L = {
  surface: '#FFFFFF', card: '#F2EFE9', border: '#E8E3DB', accent: '#B5838D',
  accentSoft: '#F2E8EA', text: '#2D2A2E', muted: '#9B9099'
};

// 🚀 RACE-CONDITION FIX: how long to wait after stopAndUnloadAsync() before
// we even acknowledge the recording is "done". On Android, the OS releases
// the file handle slightly AFTER the JS promise resolves — if Sound.createAsync
// fires inside that window, it can hard-crash the app (not just throw a JS error).
const STOP_RELEASE_DELAY_MS = 700;

// 🚀 Used by AudioPlaybackPill: how many times (and how often) to poll
// the filesystem to confirm the audio file is fully written + accessible
// before handing the uri to Audio.Sound.createAsync.
const FILE_READY_MAX_RETRIES = 6;
const FILE_READY_RETRY_DELAY_MS = 150;

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function useAudioRecorder({ onRecordingComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  // 🚀 NAYA: "Releasing" state — recording has stopped but we're inside the
  // safety window waiting for Android to free the file handle. Mic button
  // stays disabled during this tiny window so the user can't immediately
  // start a new recording on top of an unreleased session.
  const [isReleasing, setIsReleasing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recordingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // 🚀 THE MAGIC FIX: Pehle check karo permission hai ya nahi. 
      // Agar hai, toh system popup aane hi mat do (PrivacyGate trigger nahi hoga!)
      let permission = await Audio.getPermissionsAsync();
      
      if (permission.status !== 'granted') {
        permission = await Audio.requestPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is needed for Audio Notes.');
        return;
      }
      
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        staysActiveInBackground: false, 
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      recordingRef.current = recording;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
      
    } catch (err) { 
      console.log("Mic Hardware Locked/Error: ", err);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      setIsRecording(false);
      Alert.alert(
        'Mic is Busy 🎙️', 
        'Aapke phone ka microphone abhi hardware level par lock hai. Kripya phone ko ek baar restart karein.'
      ); 
    }
  }, []);

  const stopRecording = useCallback(async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);

    // Grab a stable local reference — recordingRef.current could theoretically
    // be overwritten by a fast new startRecording() call during our safety
    // delay below, and we don't want to nullify someone else's recording.
    const recording = recordingRef.current;
    if (!recording) return;

    setIsReleasing(true);

    let uri = null;

    try {
      // Step 1: ask the OS to stop + unload the recorder.
      await recording.stopAndUnloadAsync();
    } catch (err) {
      console.log("stopAndUnloadAsync error: ", err);
      // Even if this throws (e.g. "already unloaded"), continue — we still
      // want to attempt cleanup and grab whatever URI we can.
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    } catch (err) {
      console.log("setAudioModeAsync (post-stop) error: ", err);
    }

    try {
      uri = recording.getURI();
    } catch (err) {
      console.log("getURI error: ", err);
    }

    // 🚀 THE FIX: safety delay BEFORE we tell the rest of the app the
    // recording is ready. This gives Android time to fully release the
    // underlying file handle, so AudioPlaybackPill's Sound.createAsync
    // (which fires almost immediately once onRecordingComplete updates
    // state) doesn't collide with it.
    setTimeout(() => {
      // Only null out the ref if it's still pointing at THIS recording —
      // protects against a new recording having started in the meantime.
      if (recordingRef.current === recording) {
        recordingRef.current = null;
      }
      setIsReleasing(false);

      if (uri) {
        try {
          onRecordingComplete(uri);
        } catch (err) {
          console.log("onRecordingComplete error: ", err);
        }
      }
    }, STOP_RELEASE_DELAY_MS);
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

// 🚀 Polls the filesystem until the file at `path` exists AND has a
// non-zero size, or until we run out of retries. This is the guard that
// stops AudioPlaybackPill from calling Sound.createAsync on a file the
// recorder hasn't fully released yet.
async function waitUntilFileReady(path, retries = FILE_READY_MAX_RETRIES, delayMs = FILE_READY_RETRY_DELAY_MS) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && (info.size === undefined || info.size > 0)) {
        return true;
      }
    } catch (err) {
      console.log("waitUntilFileReady check error: ", err);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

function useAudioPlayer(uri) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    if (!uri) return;
    let mounted = true;
    setIsLoaded(false);

    (async () => {
      // Unload any previous sound first.
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      // 🚀 THE FIX: don't touch Sound.createAsync until the file is
      // confirmed accessible on disk. If it's a fresh recording, this
      // covers us even if onRecordingComplete fired slightly early.
      const ready = await waitUntilFileReady(uri);
      if (!mounted) return;

      if (!ready) {
        console.log("Audio file not accessible yet, skipping load:", uri);
        return;
      }

      try {
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false }, (status) => {
          if (!mounted || !status.isLoaded) return;
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) { setIsPlaying(false); sound.setPositionAsync(0); }
        });

        if (!mounted) {
          sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;
        setIsLoaded(true);
      } catch (err) {
        console.log("Sound.createAsync error: ", err);
      }
    })();

    return () => {
      mounted = false;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [uri]);

  const togglePlayback = useCallback(async () => {
    if (!soundRef.current || !isLoaded) return;
    isPlaying ? await soundRef.current.pauseAsync() : await soundRef.current.playAsync();
  }, [isPlaying, isLoaded]);

  const seek = useCallback(async (fraction) => {
    if (!soundRef.current || !duration) return;
    await soundRef.current.setPositionAsync(fraction * duration);
  }, [duration]);

  return { isPlaying, position, duration, isLoaded, togglePlayback, seek };
}

export function AudioPlaybackPill({ uri, onDelete }) {
  const { isPlaying, position, duration, isLoaded, togglePlayback, seek } = useAudioPlayer(uri);
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
      <TouchableOpacity style={[pillStyles.playBtn, isPlaying && pillStyles.playBtnActive]} onPress={togglePlayback} disabled={!isLoaded}>
        {isLoaded ? (
          <Feather name={isPlaying ? 'pause' : 'play'} size={14} color={L.accent} />
        ) : (
          <ActivityIndicator size="small" color={L.accent} />
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
      
