import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal, ScrollView, SafeAreaView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { Colors } from '../theme/colors';

export default function DrawModal({ visible, onClose, onSave }) {
  const [paths, setPaths] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Toolbar States
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  
  // Default 'false' hai, yaani pehle ungli se draw hoga. 
  // On karne par sirf 'pen' se hoga.
  const [stylusMode, setStylusMode] = useState(false);

  const viewShotRef = useRef();
  const colors = ['#000000', '#FF3B30', '#4CD964', '#007AFF', '#FF9500', '#AF52DE', '#FF2D55'];
  const sizes = [2, 4, 8, 12];

  // 1. Jab screen par pehla touch ho
  const handlePointerDown = (event) => {
    const pointerType = event.nativeEvent.pointerType; // 'touch' ya 'pen'

    // MAGIC: Agar stylus mode ON hai aur user ungli ('touch') laga raha hai, toh kuch mat karo
    if (stylusMode && pointerType !== 'pen') return;

    setIsDrawing(true);
    const newPoint = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    setCurrentPoints([newPoint]);
  };

  // 2. Jab screen par ungli/pen chale
  const handlePointerMove = (event) => {
    if (!isDrawing) return;
    const pointerType = event.nativeEvent.pointerType;

    // MAGIC: Draw karte waqt bhi check karo
    if (stylusMode && pointerType !== 'pen') return;

    const newPoint = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
    setCurrentPoints(prev => [...prev, newPoint]);
  };

  // 3. Jab ungli/pen screen se hat jaye
  const handlePointerUp = () => {
    if (!isDrawing) return;
    
    if (currentPoints.length > 0) {
      const newPath = {
        points: currentPoints,
        color: activeTool === 'eraser' ? '#FFFFFF' : activeColor,
        width: activeTool === 'highlighter' ? strokeWidth * 2 : strokeWidth,
        tool: activeTool
      };
      setPaths([...paths, newPath]);
      setHistory([]);
    }
    setCurrentPoints([]);
    setIsDrawing(false);
  };

  const undo = () => {
    if (paths.length > 0) {
      const lastPath = paths[paths.length - 1];
      setHistory([...history, lastPath]);
      setPaths(paths.slice(0, -1));
    }
  };

  const redo = () => {
    if (history.length > 0) {
      const pathToRestore = history[history.length - 1];
      setPaths([...paths, pathToRestore]);
      setHistory(history.slice(0, -1));
    }
  };

  const buildPath = (points) => {
    if (!points || points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const handleSave = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      onSave(uri);
    } catch (e) {
      console.log("Drawing save error: ", e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.cancelTxt}>❌ Cancel</Text>
          </TouchableOpacity>
          
          {/* Smart Toggle Button */}
          <TouchableOpacity 
            onPress={() => setStylusMode(!stylusMode)} 
            style={[styles.stylusBtn, stylusMode && styles.stylusBtnActive]}>
            <Text style={[styles.stylusTxt, stylusMode && {color: '#FFF'}]}>
              {stylusMode ? '✍️ Stylus Only' : '✋ Finger + Pen'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn}>
            <Text style={styles.saveTxt}>✅ Done</Text>
          </TouchableOpacity>
        </View>
        
        {/* Canvas Area (Using Pointer Events) */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1, result: 'data-uri' }} style={styles.canvasWrapper}>
          <View 
            style={styles.canvas} 
            onPointerDown={handlePointerDown} 
            onPointerMove={handlePointerMove} 
            onPointerUp={handlePointerUp}
          >
            <Svg style={StyleSheet.absoluteFill}>
              {paths.map((pathItem, i) => (
                <Path key={i} d={buildPath(pathItem.points)} stroke={pathItem.color} strokeWidth={pathItem.width} strokeOpacity={pathItem.tool === 'highlighter' ? 0.4 : 1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              <Path d={buildPath(currentPoints)} stroke={activeTool === 'eraser' ? '#FFFFFF' : activeColor} strokeWidth={activeTool === 'highlighter' ? strokeWidth * 2 : strokeWidth} strokeOpacity={activeTool === 'highlighter' ? 0.4 : 1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </ViewShot>

        {/* Pro Toolbar */}
        <View style={styles.proToolbar}>
          <View style={styles.toolbarRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollBar}>
              {sizes.map((s, i) => (
                <TouchableOpacity key={'size'+i} onPress={() => setStrokeWidth(s)} style={[styles.sizeBtn, strokeWidth === s && styles.activeBtn]}>
                  <View style={{ width: s+2, height: s+2, backgroundColor: Colors.textDark, borderRadius: 20 }} />
                </TouchableOpacity>
              ))}
              <View style={styles.divider} />
              {colors.map((c, i) => (
                <TouchableOpacity key={'color'+i} onPress={() => {setActiveColor(c); setActiveTool('pen');}} style={[styles.colorBtn, {backgroundColor: c}, activeColor === c && styles.activeColorBtn]} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.toolbarRowBottom}>
            <View style={styles.toolsGroup}>
              <TouchableOpacity onPress={() => setActiveTool('pen')} style={[styles.toolBtn, activeTool === 'pen' && styles.activeBtn]}>
                <Text style={styles.toolIcon}>🖋️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTool('highlighter')} style={[styles.toolBtn, activeTool === 'highlighter' && styles.activeBtn]}>
                <Text style={styles.toolIcon}>🖍️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setActiveTool('eraser')} style={[styles.toolBtn, activeTool === 'eraser' && styles.activeBtn]}>
                <Text style={styles.toolIcon}>🧽</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionGroup}>
              <TouchableOpacity onPress={undo} style={styles.actionBtn}><Text style={styles.actionIcon}>↩️</Text></TouchableOpacity>
              <TouchableOpacity onPress={redo} style={styles.actionBtn}><Text style={styles.actionIcon}>↪️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => {setPaths([]); setHistory([]);}} style={styles.actionBtn}><Text style={styles.actionIcon}>🗑️</Text></TouchableOpacity>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFF', elevation: 3 },
  headerBtn: { padding: 5 },
  cancelTxt: { color: 'red', fontWeight: 'bold', fontSize: 16 },
  
  stylusBtn: { backgroundColor: '#F2F2F7', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA' },
  stylusBtnActive: { backgroundColor: Colors.darkPink, borderColor: Colors.darkPink },
  stylusTxt: { fontSize: 12, fontWeight: 'bold', color: Colors.textDark },
  
  saveHeaderBtn: { backgroundColor: Colors.primaryPink, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  saveTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  canvasWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
  canvas: { flex: 1 },
  
  proToolbar: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E5E5EA', paddingBottom: 10, elevation: 15 },
  toolbarRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: '#F2F2F7' },
  scrollBar: { flexDirection: 'row' },
  sizeBtn: { width: 35, height: 35, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, borderRadius: 8 },
  colorBtn: { width: 30, height: 30, borderRadius: 15, marginHorizontal: 8, borderWidth: 2, borderColor: '#E5E5EA', elevation: 2 },
  activeColorBtn: { borderColor: Colors.darkPink, transform: [{ scale: 1.2 }] },
  divider: { width: 1, backgroundColor: '#C7C7CC', marginHorizontal: 10, height: 25, alignSelf: 'center' },
  
  toolbarRowBottom: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 10 },
  toolsGroup: { flexDirection: 'row', backgroundColor: '#F2F2F7', borderRadius: 12, padding: 5 },
  actionGroup: { flexDirection: 'row' },
  toolBtn: { padding: 10, borderRadius: 8, marginHorizontal: 2 },
  activeBtn: { backgroundColor: '#E5E5EA' },
  toolIcon: { fontSize: 22 },
  actionBtn: { padding: 10, marginHorizontal: 5 },
  actionIcon: { fontSize: 22 }
});
    
