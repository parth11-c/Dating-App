import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Share, Linking, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useStore } from "@/store";
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from "@/lib/supabase";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPost } = useStore();
  const post = id ? getPost(id) : undefined;
  const insets = useSafeAreaInsets();
  
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [seller, setSeller] = React.useState<{ name: string; avatar_url?: string; phone?: string } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!post?.userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_url, phone')
        .eq('id', post.userId)
        .single();
      if (mounted) setSeller(data as any);
    })();
    return () => { mounted = false; };
  }, [post?.userId]);

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Product not found.</Text>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this product: ${post.title} - ${post.description?.substring(0, 100)}...`,
        url: `https://clgmart.com/products/${id}`,
        title: post.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContactSeller = () => {
    const phoneNumber = seller?.phone?.replace(/\s+/g, '');
    if (!phoneNumber) {
      Alert.alert('No phone number', 'The seller has not added a phone number yet.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    const message = `Hi, I'm interested in your product: ${post.title}`;
    const raw = seller?.phone?.trim();
    if (!raw) {
      Alert.alert('WhatsApp unavailable', 'The seller has not added a WhatsApp number yet.');
      return;
    }
    // wa.me requires international number without '+' and without any special chars
    const digits = raw.replace(/\D+/g, '');
    if (!digits) {
      Alert.alert('Invalid number', 'The seller phone number appears invalid.');
      return;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    WebBrowser.openBrowserAsync(url);
  };

  // No direct buy on this screen for now

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: post.imageUri }} 
            style={styles.image} 
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          {/* Image Pagination Dots */}
          <View style={styles.imagePagination}>
            {[1, 2, 3].map((_: number, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.paginationDot,
                  idx === activeImageIndex ? styles.paginationDotActive : undefined,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productHeader}>
          <View>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.category}>{post.category || 'General'}</Text>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-social" size={20} color="#aaa" />
          </TouchableOpacity>
        </View>

        {/* Price and chips */}
        <View style={styles.priceContainer}> 
          <Text style={styles.price}>₹{post.price?.toFixed(2) || '0.00'}</Text>
          <View style={styles.chipsRow}>
            {post.condition ? (
              <View style={styles.chip}><Text style={styles.chipText}>{post.condition}</Text></View>
            ) : null}
            {post.category ? (
              <View style={styles.chipSecondary}><Text style={styles.chipSecondaryText}>{post.category}</Text></View>
            ) : null}
          </View>
        </View>

        {/* Spacing */}
        <View style={{ height: 8 }} />

        {/* Description */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>
            {post.description || 'No description provided.'}
          </Text>
        </View>

        {/* Seller Info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Seller</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.sellerCard}
            onPress={() => router.push(`/profile/${post.userId}` as any)}
          >
            {seller?.avatar_url ? (
              <Image source={{ uri: seller.avatar_url }} style={styles.sellerAvatarImage} />
            ) : (
              <View style={styles.sellerAvatar}> 
                <Ionicons name="person" size={24} color="#aaa" />
              </View>
            )}
            <View style={styles.sellerDetails}>
              <Text style={styles.sellerName}>{seller?.name || 'Seller'}</Text>
              <Text style={styles.sellerSub}>@{post.userId}</Text>
              {!!seller?.phone && (
                <View style={styles.sellerMetaRow}>
                  <Ionicons name="call-outline" size={14} color="#9aa0a6" />
                  <Text style={styles.sellerMetaText}>{seller.phone}</Text>
                </View>
              )}
            </View>
            <View style={styles.viewProfileBtn}>
              <Ionicons name="chevron-forward" size={18} color="#bbb" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}> 
        <TouchableOpacity style={[styles.ctaButton, styles.ctaOutline]} onPress={handleContactSeller}>
          <Ionicons name="chatbubble-ellipses" size={18} color="#4da3ff" />
          <Text style={styles.ctaOutlineText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaButton, styles.ctaPrimary]} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color="#0a0a0a" />
          <Text style={styles.ctaPrimaryText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
    paddingBottom: 120, // Extra padding for bottom bar
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  muted: {
    color: '#aaa',
    fontSize: 16,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  imagePagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: '#aaa',
  },
  shareButton: {
    padding: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    backgroundColor: '#132a17',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  chipText: {
    color: '#7ddc7a',
    fontSize: 12,
    fontWeight: '500',
  },
  chipSecondary: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipSecondaryText: {
    color: '#bbb',
    fontSize: 12,
    fontWeight: '500',
  },
  conditionBadge: {
    backgroundColor: '#132a17',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionText: {
    color: '#7ddc7a',
    fontSize: 14,
    fontWeight: '500',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ddd',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '500',
    marginHorizontal: 16,
    color: '#fff',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ddd',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#bbb',
    lineHeight: 22,
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#111',
    marginRight: 12,
  },
  sellerAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  sellerSub: {
    color: '#888',
    fontSize: 12,
  },
  sellerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  sellerMetaText: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  viewProfileBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    color: '#aaa',
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0d0d0d',
    borderTopWidth: 1,
    borderTopColor: '#222',
    padding: 16,
    paddingBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  ctaOutline: {
    borderWidth: 1,
    borderColor: '#4da3ff',
    backgroundColor: 'transparent',
  },
  ctaOutlineText: {
    color: '#4da3ff',
    fontWeight: '600',
  },
  ctaPrimary: {
    backgroundColor: '#25D366',
  },
  ctaPrimaryText: {
    color: '#0a0a0a',
    fontWeight: '700',
  },
});
