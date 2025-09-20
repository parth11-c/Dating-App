import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, PanResponder, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { router } from "expo-router";
import * as Haptics from 'expo-haptics';

// Persist the last viewed index while the app session lives
let lastExploreIndex = 0;

export default function ExploreScreen() {
  const { posts } = useStore();
  const [index, setIndex] = React.useState<number>(() => lastExploreIndex || 0);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const position = React.useRef(new Animated.ValueXY()).current;

  const filtered = posts;

  // Reset index when results change
  React.useEffect(() => {
    const nextIndex = (lastExploreIndex < filtered.length) ? lastExploreIndex : 0;
    setIndex(nextIndex);
    position.setValue({ x: 0, y: 0 });
  }, [filtered.length]);

  // Maintain original image aspect ratio
  const [imgSize, setImgSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  React.useEffect(() => {
    const uri = filtered[index]?.imageUri;
    if (!uri) { setImgSize({ w: 0, h: 0 }); return; }
    Image.getSize(uri, (w, h) => setImgSize({ w, h }), () => setImgSize({ w: 0, h: 0 }));
  }, [filtered, index]);

  const onPressItem = (id: string) => router.push(`/post/${id}` as any);

  const rotate = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const nextIndex = React.useCallback(() => (filtered.length ? (index + 1) % filtered.length : 0), [index, filtered.length]);
  const prevIndex = React.useCallback(() => (filtered.length ? (index - 1 + filtered.length) % filtered.length : 0), [index, filtered.length]);

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
    onPanResponderRelease: async (_, gesture) => {
      const threshold = 30;
      const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
      // Horizontal gestures first
      if (isHorizontal && gesture.dx <= -threshold) {
        // Swipe left -> next card
        Animated.timing(position, { toValue: { x: -screenWidth, y: gesture.dy }, duration: 180, useNativeDriver: true }).start(() => {
          position.setValue({ x: 0, y: 0 });
          setIndex((prev: number) => {
            const ni = filtered.length ? (prev + 1) % filtered.length : 0;
            lastExploreIndex = ni;
            return ni;
          });
        });
        try { await Haptics.selectionAsync(); } catch {}
      } else if (isHorizontal && gesture.dx >= threshold) {
        // Swipe right -> open details
        const item = filtered[index];
        if (item) onPressItem(item.id);
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        try { await Haptics.selectionAsync(); } catch {}
      } else if (!isHorizontal && gesture.dy <= -threshold) {
        // Swipe up -> skip (next)
        Animated.timing(position, { toValue: { x: 0, y: -120 }, duration: 160, useNativeDriver: true }).start(() => {
          position.setValue({ x: 0, y: 0 });
          setIndex((prev: number) => {
            const ni = filtered.length ? (prev + 1) % filtered.length : 0;
            lastExploreIndex = ni;
            return ni;
          });
        });
        try { await Haptics.selectionAsync(); } catch {}
      } else if (!isHorizontal && gesture.dy >= threshold) {
        // Swipe down -> backtrack (previous)
        Animated.timing(position, { toValue: { x: 0, y: 120 }, duration: 160, useNativeDriver: true }).start(() => {
          position.setValue({ x: 0, y: 0 });
          setIndex((prev: number) => {
            const pi = filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0;
            lastExploreIndex = pi;
            return pi;
          });
        });
        try { await Haptics.selectionAsync(); } catch {}
      } else {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    },
  }), [filtered, index]);

  // Overlay labels based on drag amount
  const nextOpacity = position.x.interpolate({ inputRange: [-120, -40, 0], outputRange: [1, 0.2, 0], extrapolate: 'clamp' });
  const openOpacity = position.x.interpolate({ inputRange: [0, 40, 120], outputRange: [0, 0.2, 1], extrapolate: 'clamp' });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.text}>No posts yet.</Text>
        </View>
      ) : (
        <View style={styles.swipeArea}>
          {filtered[index] && (
            <Animated.View
              style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
              {...panResponder.panHandlers}
            >
              {/* Overlay labels */}
              <Animated.View style={[styles.badgeLeft, { opacity: nextOpacity }]}> 
                <Text style={styles.badgeText}>Next</Text>
              </Animated.View>
              <Animated.View style={[styles.badgeRight, { opacity: openOpacity }]}> 
                <Text style={styles.badgeText}>Open</Text>
              </Animated.View>

              <TouchableOpacity activeOpacity={0.85} onPress={() => onPressItem(filtered[index].id)}>
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: filtered[index].imageUri }}
                    style={[
                      styles.image,
                      imgSize.w > 0 && imgSize.h > 0 ? { aspectRatio: imgSize.w / imgSize.h } : null,
                    ]}
                    resizeMode="contain"
                  />
                  <View style={styles.imageOverlay} />
                  <View style={styles.priceBadge}><Text style={styles.priceBadgeText}>₹{filtered[index].price?.toFixed?.(0) ?? filtered[index].price}</Text></View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.title} numberOfLines={1}>{filtered[index].title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{filtered[index].category} • {String(filtered[index].condition).toLowerCase()} condition</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  // search removed
  swipeArea: { flex: 1, padding: 12, justifyContent: 'center' },
  text: { color: "#fff", textAlign: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { 
    backgroundColor: "#111", 
    borderRadius: 12, 
    overflow: "hidden", 
    marginBottom: 0, 
    borderColor: "#222", 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  image: { width: "100%", backgroundColor: "#222" },
  imageOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  priceBadge: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(10,10,10,0.85)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  priceBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cardBody: { padding: 12 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  meta: { color: "#aaa", fontSize: 12 },
  badgeLeft: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderColor: '#333', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeRight: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderColor: '#333', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
});
