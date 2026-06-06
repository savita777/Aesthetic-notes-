import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableOpacity, Text, View } from 'react-native';

export default function DraggableSticker({ item, onRemove }) {
  // Animated value jo x aur y position track karegi
  const pan = useRef(new Animated.ValueXY()).current;

  // Ungli se drag karne ka logic (PanResponder)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false } // Position update karne ke liye
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.stickerWrapper,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity onLongPress={() => onRemove(item.id)} activeOpacity={0.8}>
        {item.type === 'washi' ? (
          // Washi Tape Design (Semi-transparent rectangle)
          <View style={[styles.washiTape, { backgroundColor: item.color }]} />
        ) : (
          // Cute Emoji Sticker
          <Text style={styles.emojiText}>{item.content}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stickerWrapper: {
    position: 'absolute',
    top: 50, // Default start position
    left: 50,
    zIndex: 100, // Text ke upar dikhne ke liye
  },
  emojiText: {
    fontSize: 45, // Bada sticker
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  washiTape: {
    width: 120,
    height: 30,
    opacity: 0.6, // Transparent tape effect
    transform: [{ rotate: '-5deg' }], // Thoda teda aesthetic look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  }
});
