import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg'; // 🚀 QR Code Wapas Aagaya!
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Thoda lamba kiya (1:1.4 ratio) taaki QR code aur Note dono aesthetic lagen
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const CARD_HEIGHT = CARD_WIDTH * 1.4; 

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const CARD_PALETTES = [
  { from: '#FDE8EE', to: '#FAD4DF', ink: '#4A2030', muted: 'rgba(74,32,48,0.45)' },
  { from: '#E8F0FE', to: '#D2E3FC', ink: '#1A3055', muted: 'rgba(26,48,85,0.45)' },
  { from: '#E8F5E9', to: '#C8E6C9', ink: '#1B4028', muted: 'rgba(27,64,40,0.45)' },
  { from: '#FFF3E0', to: '#FFE0B2', ink: '#4A2800', muted: 'rgba(74,40,0,0.45)'  },
  { from: '#F3E5F5', to: '#E1BEE7', ink: '#3A1248', muted: 'rgba(58,18,72,0.45)' },
  { from: '#E0F7FA', to: '#B2EBF2', ink: '#00363A', muted: 'rgba(0,54,58,0.45)'  },
  { from: '#FBE9E7', to: '#FFCCBC', ink: '#4E1500', muted: 'rgba(78,21,0,0.45)'  },
  { from: '#F9FBE7', to: '#F0F4C3', ink: '#2E3300', muted: 'rgba(46,51,0,0.45)'  },
];

function paletteForTitle(title = '') {
  const code = title.charCodeAt(0) || 0;
  return CARD_PALETTES[code % CARD_PALETTES.length];
}

function stripHtml(html = '') {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const CONTENT_CHAR_LIMIT = 280; // QR code ke liye jagah banane ke liye text thoda chota kiya
const DEFAULT_TITLE = 'A Thought Worth Keeping';
const DEFAULT_CONTENT = 'The mind is not a vessel to be filled, but a fire to be kindled.\n\n— Plutarch';

export default function StudygramShareModal({ visible, onClose, note }) {
  const { theme } = useTheme();
  const cardRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const rawTitle   = note?.title?.trim()   || DEFAULT_TITLE;
  const rawContent = note?.content?.trim() || DEFAULT_CONTENT;
  const plainContent = stripHtml(rawContent);

  const displayContent = plainContent.length > CONTENT_CHAR_LIMIT
    ? plainContent.slice(0, plainContent.lastIndexOf(' ', CONTENT_CHAR_LIMIT)) + '…'
    : plainContent;

  const folder   = note?.folder || null;
  const palette  = paletteForTitle(rawTitle);
  const today    = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsCapturing(true);
    try {
      const uri = await cardRef.current.capture({
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Lumina card',
      });
    } catch (err) {
      Alert.alert('Could not capture card', err.message || 'Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(18,14,16,0.72)" barStyle="light-content" />

      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>

          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Share Card</Text>
              <Text style={[styles.sheetSubtitle, { color: theme.muted }]}>
                Save or share your thought as an image
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color={theme.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.cardScroll} showsVerticalScrollIndicator={false}>
            <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
              <View style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT, backgroundColor: palette.from }]}>

                <View style={[styles.cardGradientLayer, { backgroundColor: palette.to }]} />
                <View style={[styles.cornerAccent, { borderColor: palette.muted }]} />
                <View style={[styles.cornerAccentBL, { borderColor: palette.muted }]} />

                <View style={styles.cardBody}>
                  <View style={styles.contentTop}>
                    {folder ? (
                      <View style={[styles.folderPill, { borderColor: palette.muted }]}>
                        <Text style={[styles.folderPillText, { color: palette.muted }]}>{folder}</Text>
                      </View>
                    ) : (
                      <View style={styles.folderPillPlaceholder} />
                    )}

                    <Text style={[styles.quoteMark, { color: palette.muted }]}>"</Text>
                    
                    <Text style={[styles.cardTitle, { color: palette.ink }]} numberOfLines={3}>
                      {rawTitle}
                    </Text>

                    <View style={[styles.rule, { backgroundColor: palette.muted }]} />

                    <Text style={[styles.cardContent, { color: palette.ink }]}>
                      {displayContent}
                    </Text>
                  </View>

                  {/* 🚀 VIRAL MARKETING BLOCK (Merged safely) */}
                  <View style={[styles.referralBlock, { borderColor: palette.muted }]}>
                    <View style={[styles.qrContainer, { borderColor: palette.muted }]}>
                      <QRCode 
                        value="https://luminanotes.com/download" 
                        size={38} 
                        color={palette.ink} 
                        backgroundColor="transparent" 
                      />
                    </View>
                    <View style={styles.referralTextContainer}>
                      <Text style={[styles.referralHeadline, { color: palette.ink }]}>Create your aesthetic library</Text>
                      <Text style={[styles.referralCTA, { color: palette.muted }]}>Scan to download Lumina ↗</Text>
                    </View>
                  </View>

                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.footerDate, { color: palette.muted }]}>{today}</Text>
                  <Text style={[styles.watermark, { color: palette.muted }]}>
                    Thoughtfully yours, Lumina ✨
                  </Text>
                </View>
              </View>
            </ViewShot>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnCancel, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text style={[styles.btnCancelText, { color: theme.muted }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnShare, { backgroundColor: theme.accent }]}
              onPress={handleShare}
              disabled={isCapturing}
              activeOpacity={0.85}
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#FFFFFF" />
                  <Text style={styles.btnShareText}>Share to Story  ✦</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 14, 16, 0.72)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 16, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 28, maxHeight: SCREEN_HEIGHT * 0.90, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginBottom: 3 },
  sheetSubtitle: { fontSize: 12, fontWeight: '500' },
  closeIconBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardScroll: { alignItems: 'center', paddingBottom: 20 },
  card: { borderRadius: 28, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
  cardGradientLayer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', opacity: 0.55, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  cornerAccent: { position: 'absolute', top: -CARD_WIDTH * 0.18, right: -CARD_WIDTH * 0.18, width: CARD_WIDTH * 0.45, height: CARD_WIDTH * 0.45, borderRadius: CARD_WIDTH * 0.225, borderWidth: 1, opacity: 0.25 },
  cornerAccentBL: { position: 'absolute', bottom: -CARD_WIDTH * 0.12, left: -CARD_WIDTH * 0.12, width: CARD_WIDTH * 0.32, height: CARD_WIDTH * 0.32, borderRadius: CARD_WIDTH * 0.16, borderWidth: 1, opacity: 0.18 },
  
  cardBody: { flex: 1, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 0, justifyContent: 'space-between' },
  contentTop: { flex: 1 },
  
  folderPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 14 },
  folderPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  folderPillPlaceholder: { height: 26, marginBottom: 14 },
  quoteMark: { fontFamily: SERIF, fontSize: 64, lineHeight: 54, marginBottom: 4, opacity: 0.25 },
  cardTitle: { fontFamily: SERIF, fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3, marginBottom: 12 },
  rule: { width: 36, height: 1.5, borderRadius: 1, marginBottom: 14, opacity: 0.4 },
  cardContent: { fontFamily: SERIF, fontSize: 13.5, lineHeight: 21, opacity: 0.82 },
  
  // NAYA: Referral Block Styles merged with Theme
  referralBlock: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.3)', padding: 10, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 12 },
  qrContainer: { padding: 4, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 8, borderWidth: 1 },
  referralTextContainer: { flex: 1, justifyContent: 'center' },
  referralHeadline: { fontFamily: SERIF, fontStyle: 'italic', fontSize: 11, marginBottom: 2, fontWeight: '600' },
  referralCTA: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardFooter: { paddingHorizontal: 28, paddingBottom: 24, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerDate: { fontSize: 9, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.6 },
  watermark: { fontFamily: SERIF, fontSize: 9, fontStyle: 'italic', opacity: 0.55, textAlign: 'right', flexShrink: 1, marginLeft: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btnCancel: { borderWidth: 1, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { fontSize: 14, fontWeight: '600' },
  btnShare: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 15, shadowColor: '#B5838D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 10, elevation: 5 },
  btnShareText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
        
