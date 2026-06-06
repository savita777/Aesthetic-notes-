import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { Colors } from '../theme/colors';

export default function DrawModal({ visible, onClose, onSave }) {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const viewShotRef = useRef();

  const onTouchMove = (event) => {
    const newPoint = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    setCurrentPath(prev => [...prev, newPoint]);
  };

  const onTouchEnd = () => {
    setPaths([...paths, currentPath]);
    setCurrentPath([]);
  };

  const buildPath = (points) => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const handleSave = async () => {
    try {
      // Drawing ko Base64 Image mein badal rahe hain taaki save aur PDF karna aasan ho
      const uri = await viewShotRef.current.capture();
      onSave(uri);
    } catch (e) {
      console.log("Drawing save error: ", e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}><Text style={styles.cancelTxt}>❌ Cancel</Text></TouchableOpacity>
            <Text style={styles.title}>Doodle Here 🎨</Text>
            <TouchableOpacity onPress={() => setPaths([])}><Text style={styles.clearTxt}>🧹 Clear</Text></TouchableOpacity>
          </View>
          
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.8, result: 'data-uri' }} style={styles.canvasWrapper}>
            <View style={styles.canvas} onTouchStart={onTouchMove} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <Svg style={StyleSheet.absoluteFill}>
                {paths.map((p, i) => (
                  <Path key={i} d={buildPath(p)} stroke={Colors.darkPink} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                <Path d={buildPath(currentPath)} stroke={Colors.darkPink} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </ViewShot>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveTxt}>✅ Add to Note</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: Colors.background, borderRadius: 20, padding: 15, height: '70%', elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 18, fontWeight: 'bold', color: Colors.textDark },
  cancelTxt: { color: 'red', fontWeight: 'bold' },
  clearTxt: { color: Colors.textLight, fontWeight: 'bold' },
  canvasWrapper: { flex: 1, backgroundColor: '#FFF', borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: Colors.primaryPink },
  canvas: { flex: 1 },
  saveBtn: { backgroundColor: Colors.darkPink, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 15 },
  saveTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
  
