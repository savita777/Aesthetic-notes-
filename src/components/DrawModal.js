import React, { useState, useRef } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, PanResponder, SafeAreaView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

export default function DrawModal({ visible, onClose, onSave }) {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [activeColor, setActiveColor] = useState('#FF69B4'); // Hot Pink
  
  const viewShotRef = useRef();

  // The Magic Touch Engine
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([`${locationX},${locationY}`]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(prev => [...prev, `${locationX},${locationY}`]);
      },
      onPanResponderRelease: () => {
        setPaths(prev => [...prev, { points: currentPath, color: activeColor }]);
        setCurrentPath([]);
      }
    })
  ).current;

  const handleSaveDoodle = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      onSave(uri);
      setPaths([]); 
      setCurrentPath([]);
    } catch (e) {
      console.log("Doodle save error: ", e);
    }
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const cuteColors = ['#FF69B4', '#9370DB', '#00CED1', '#32CD32', '#FFA500', '#000000'];

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.modalContainer}>
        
        {/* Top Control Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>❌ Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearBtn}>🗑️ Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSaveDoodle} style={styles.saveBtn}>
            <Text style={styles.saveText}>✅ Save</Text>
          </TouchableOpacity>
        </View>

        {/* Cute Color Picker */}
        <View style={styles.colorPicker}>
          {cuteColors.map(color => (
            <TouchableOpacity 
              key={color} 
              onPress={() => setActiveColor(color)} 
              style={[
                styles.colorBox, 
                { backgroundColor: color, borderColor: '#333', borderWidth: activeColor === color ? 3 : 0 }
              ]} 
            />
          ))}
        </View>

        {/* Full Screen Drawing Canvas */}
        <View style={styles.canvasWrapper}>
          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={styles.canvasContainer}>
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
              <Svg style={StyleSheet.absoluteFill}>
                {/* Crash Fix: points.length > 1 */}
                {paths.map((p, index) => (
                  p.points.length > 1 ? (
                    <Path 
                      key={index} 
                      d={`M ${p.points.join(' L ')}`} 
                      stroke={p.color} 
                      strokeWidth={6} 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  ) : null
                ))}
                {currentPath.length > 1 && (
                  <Path 
                    d={`M ${currentPath.join(' L ')}`} 
                    stroke={activeColor} 
                    strokeWidth={6} 
                    fill="none" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                )}
              </Svg>
            </View>
          </ViewShot>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#FFE4E1' }, // Ye Full Screen karega
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40 },
  closeBtn: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
  clearBtn: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#FF69B4', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  colorPicker: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15, gap: 10 },
  colorBox: { width: 40, height: 40, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
  
  canvasWrapper: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', elevation: 5 },
  canvasContainer: { flex: 1, backgroundColor: '#FFF' }, 
});
    
