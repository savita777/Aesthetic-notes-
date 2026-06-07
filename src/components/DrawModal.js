import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const COLORS = ['#000000', '#FF69B4', '#8A2BE2', '#4169E1', '#32CD32', '#FFD700', '#FFFFFF'];
const WIDTHS = [3, 8, 15]; // Patla, Medium, Mota

export default function DrawModal({ visible, onClose, onSave }) {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#FF69B4'); // Default Pink
  const [selectedWidth, setSelectedWidth] = useState(8);

  // Drawing shuru hote hi naya path banao
  const onTouchStart = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    setCurrentPath({
      d: `M${locationX},${locationY}`,
      color: selectedColor,
      strokeWidth: selectedWidth,
    });
  };

  // Ungli chalate waqt path ko bada karo (Ab ye line nahi mitegi!)
  const onTouchMove = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    if (currentPath) {
      setCurrentPath(prev => ({
        ...prev,
        d: `${prev.d} L${locationX},${locationY}`,
      }));
    }
  };

  // Ungli uthate hi path ko save kar lo
  const onTouchEnd = () => {
    if (currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    }
  };

  const handleClear = () => setPaths([]);

  // Ek step peeche jane ka jadoo
  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleSave = () => {
    onSave(paths); // Saved drawing ko NoteScreen bhejo
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        
        {/* TOP TOOLBAR */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.btn}>
            <Text style={styles.btnText}>❌ Close</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleUndo} style={styles.btn}>
            <Text style={styles.btnText}>↩️ Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.btn}>
            <Text style={styles.btnText}>🗑️ Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={[styles.btn, styles.saveBtn]}>
            <Text style={styles.saveBtnText}>✅ Save</Text>
          </TouchableOpacity>
        </View>

        {/* CANVAS - Drawing Area */}
        <View 
          style={styles.canvasContainer}
          onStartShouldSetResponder={() => true} // Android ko force karega touch pakadne ke liye
          onResponderGrant={onTouchStart}
          onResponderMove={onTouchMove}
          onResponderRelease={onTouchEnd}
        >
          <Svg style={StyleSheet.absoluteFill}>
            {/* Pehle ki draw ki hui lines */}
            {paths.map((p, index) => (
              <Path
                key={index}
                d={p.d}
                stroke={p.color}
                strokeWidth={p.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* Jo line abhi draw ho rahi hai */}
            {currentPath && (
              <Path
                d={currentPath.d}
                stroke={currentPath.color}
                strokeWidth={currentPath.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </View>

        {/* BOTTOM TOOLBAR - Pen Features */}
        <View style={styles.tools}>
          
          {/* Colors */}
          <View style={styles.colorPicker}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorBox, 
                  { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0 }
                ]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>

          {/* Pen Thickness (Motai) */}
          <View style={styles.widthPicker}>
            {WIDTHS.map(w => (
              <TouchableOpacity
                key={w}
                style={[
                  styles.widthBox, 
                  { borderColor: selectedWidth === w ? '#FF69B4' : '#ccc' }
                ]}
                onPress={() => setSelectedWidth(w)}
              >
                <View style={{ width: w * 1.5, height: w * 1.5, borderRadius: w, backgroundColor: selectedColor }} />
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' }, // Blush Pink background
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#FFE4E1' },
  btn: { padding: 8, borderRadius: 8, backgroundColor: '#fff', elevation: 2 },
  saveBtn: { backgroundColor: '#FF69B4' },
  btnText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  saveBtnText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  
  canvasContainer: { 
    flex: 1, 
    backgroundColor: '#fff', 
    margin: 10, 
    borderRadius: 15, 
    overflow: 'hidden', 
    elevation: 4 
  },
  
  tools: { padding: 20, backgroundColor: '#FFE4E1', borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  colorPicker: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  colorBox: { width: 35, height: 35, borderRadius: 17.5, borderColor: '#333' },
  
  widthPicker: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  widthBox: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
    
