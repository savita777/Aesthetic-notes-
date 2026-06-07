import React, { useState, useRef } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

export default function DrawModal({ visible, onClose, onSave }) {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [activeColor, setActiveColor] = useState('#FF69B4'); // Default Hot Pink 🌸
  
  const viewShotRef = useRef();

  // VIP Touch Engine: Jo Ungli aur Stylus dono pakdega
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, // Ungli rakhte hi drawing shuru
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([`${locationX},${locationY}`]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        // Ungli ke move hone par points add karna
        setCurrentPath(prev => [...prev, `${locationX},${locationY}`]);
      },
      onPanResponderRelease: () => {
        // Ungli uthate hi stroke ko save karna
        setPaths(prev => [...prev, { points: currentPath, color: activeColor }]);
        setCurrentPath([]);
      }
    })
  ).current;

  // Drawing ka screenshot nikal kar NoteScreen ko bhejna
  const handleSaveDoodle = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      onSave(uri);
      // Save hone ke baad canvas saaf kar do
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
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          
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
                  { backgroundColor: color, borderColor: '#FFF', borderWidth: activeColor === color ? 4 : 0 }
                ]} 
              />
            ))}
          </View>

          {/* The Drawing Canvas */}
          <View style={styles.canvasWrapper}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={styles.canvasContainer}>
              <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
                <Svg style={StyleSheet.absoluteFill}>
                  {/* Purane strokes draw karein */}
                  {paths.map((p, index) => (
                    <Path 
                      key={index} 
                      d={`M ${p.points.join(' L ')}`} 
                      stroke={p.color} 
                      strokeWidth={6} // Thoda thick marker jaisa feel
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  ))}
                  {/* Jo stroke abhi ban raha hai */}
                  {currentPath.length > 0 && (
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

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFE4E1', height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  closeBtn: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
  clearBtn: { color: '#555', fontSize: 16, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#FF69B4', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  colorPicker: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15, gap: 10 },
  colorBox: { width: 35, height: 35, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
  
  canvasWrapper: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#FFF0F5' },
  canvasContainer: { flex: 1, backgroundColor: '#FFF' }, // Ye transparent ya white rakh sakte hain
});
    
