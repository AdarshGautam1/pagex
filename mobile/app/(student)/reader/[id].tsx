import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('Reading Book');
  const [loading, setLoading] = useState(true);
  const [readingSeconds, setReadingSeconds] = useState(0);

  // Bookmark modal state
  const [bookmarkModalVisible, setBookmarkModalVisible] = useState(false);
  const [pageNumberInput, setPageNumberInput] = useState('1');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [savingBookmark, setSavingBookmark] = useState(false);

  // End Session Summary modal state
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<any>(null);

  const heartbeatIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);

  sessionIdRef.current = sessionId;

  // 1. Start reading session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.startReading(id);
        if (!isMounted) return;

        setSessionId(res.session_id);
        setPdfUrl(res.pdf_url);
        setBookTitle(res.book_title);

        // Start 30-second heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (sessionIdRef.current) {
            api.heartbeatReading(sessionIdRef.current).catch((err) => {
              console.warn('Heartbeat error:', err);
            });
          }
        }, 30000);

        // Local second counter for UI display
        timerIntervalRef.current = setInterval(() => {
          setReadingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err: any) {
        Alert.alert('Session Error', err.message || 'Failed to start reading session.');
        router.back();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    // 2. Clean up & end session on unmount
    return () => {
      isMounted = false;
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (sessionIdRef.current) {
        api.endReading(sessionIdRef.current).catch(() => {});
      }
    };
  }, [id]);

  // Handle User-Initiated Exit
  const handleExitReader = async () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (sessionId) {
      try {
        setLoading(true);
        const summary = await api.endReading(sessionId);
        setSessionSummary(summary);
        sessionIdRef.current = null; // Prevent duplicate end on unmount
        setSummaryModalVisible(true);
      } catch (err) {
        router.back();
      } finally {
        setLoading(false);
      }
    } else {
      router.back();
    }
  };

  const handleSaveBookmark = async () => {
    if (!id) return;
    const pageNum = parseInt(pageNumberInput, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      Alert.alert('Invalid Page', 'Please enter a valid page number.');
      return;
    }

    try {
      setSavingBookmark(true);
      await api.createBookmark({
        book_id: id,
        page_number: pageNum,
        note: bookmarkNote.trim() || undefined,
      });
      setBookmarkModalVisible(false);
      Alert.alert('Bookmark Saved', `Page ${pageNum} saved successfully.`);
      setBookmarkNote('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save bookmark.');
    } finally {
      setSavingBookmark(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getPdfSource = () => {
    if (!pdfUrl) return undefined;

    // On iOS, WKWebView renders raw PDFs natively
    if (Platform.OS === 'ios') {
      return { uri: pdfUrl };
    }

    // On Android & Web: Android WebView cannot render raw PDFs directly and triggers
    // a file download instead. We render using a customized PDF.js HTML canvas viewer.
    const encodedUrl = encodeURIComponent(pdfUrl);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
        <title>PAGEX Reader</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            background-color: #1F1B18;
            color: #EDE7DE;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100%;
          }
          #viewer-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 12px 72px 12px;
            gap: 16px;
          }
          .page-card {
            background-color: #FFFFFF;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            border-radius: 4px;
            overflow: hidden;
            width: 100%;
            max-width: 760px;
          }
          canvas {
            display: block;
            width: 100% !important;
            height: auto !important;
          }
          .page-num {
            text-align: center;
            font-size: 11px;
            letter-spacing: 0.5px;
            color: #9E9484;
            padding-top: 6px;
          }
          #status-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 64px 20px;
            text-align: center;
          }
          .spinner {
            width: 38px;
            height: 38px;
            border: 3px solid rgba(194, 91, 61, 0.2);
            border-top-color: #C25B3D;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 14px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .status-title {
            font-size: 15px;
            font-weight: 600;
            color: #FAF6F0;
          }
          .status-sub {
            font-size: 12px;
            color: #9E9484;
            margin-top: 6px;
          }
          #error-box {
            display: none;
            padding: 32px 20px;
            text-align: center;
          }
          .error-msg {
            color: #E06C75;
            font-size: 14px;
            margin-bottom: 16px;
          }
          .fallback-btn {
            display: inline-block;
            padding: 10px 20px;
            background-color: #C25B3D;
            color: #FFFFFF;
            text-decoration: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div id="status-box">
          <div class="spinner"></div>
          <div class="status-title">Loading Digital Edition...</div>
          <div class="status-sub">Rendering high-resolution reader pages</div>
        </div>

        <div id="error-box">
          <div class="error-msg" id="error-text">Unable to render PDF directly.</div>
          <a class="fallback-btn" href="https://docs.google.com/gview?embedded=true&url=${encodedUrl}">Open in Google Reader</a>
        </div>

        <div id="viewer-container"></div>

        <script>
          const url = ${JSON.stringify(pdfUrl)};
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          async function startRender() {
            try {
              const loadingTask = pdfjsLib.getDocument({
                url: url,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
              });
              const pdf = await loadingTask.promise;
              document.getElementById('status-box').style.display = 'none';
              const container = document.getElementById('viewer-container');

              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });

                const card = document.createElement('div');
                card.className = 'page-card';

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                card.appendChild(canvas);
                container.appendChild(card);

                const num = document.createElement('div');
                num.className = 'page-num';
                num.innerText = 'Page ' + pageNum + ' of ' + pdf.numPages;
                container.appendChild(num);
              }
            } catch (err) {
              console.error('PDF.js render error:', err);
              document.getElementById('status-box').style.display = 'none';
              const errBox = document.getElementById('error-box');
              errBox.style.display = 'block';
              document.getElementById('error-text').innerText = 'Could not render PDF: ' + (err.message || err);
            }
          }

          startRender();
        </script>
      </body>
      </html>
    `;

    return { html: htmlContent };
  };

  return (
    <View style={styles.container}>
      {/* Top Controls Overlay */}
      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 12) + spacing.xs }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleExitReader}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={24} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.headerBookTitle} numberOfLines={1}>{bookTitle}</Text>
          <Text style={styles.timerText}>
            ⏱ {formatTimer(readingSeconds)} {readingSeconds >= 300 ? '· Qualified! 🔥' : '· Read 5m for XP'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setBookmarkModalVisible(true)}
          style={styles.bookmarkBtn}
        >
          <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Reader Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading protected book securely...</Text>
        </View>
      ) : pdfUrl ? (
        <WebView
          source={getPdfSource()}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          scalesPageToFit={Platform.OS === 'android'}
          startInLoadingState={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Unable to load digital edition.</Text>
        </View>
      )}

      {/* Bookmark Modal */}
      <Modal
        visible={bookmarkModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBookmarkModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Bookmark</Text>
            <Text style={styles.modalSubtitle}>Save your place and add an optional note.</Text>

            <Input
              label="PAGE NUMBER"
              keyboardType="number-pad"
              value={pageNumberInput}
              onChangeText={setPageNumberInput}
            />

            <Input
              label="NOTE (OPTIONAL)"
              placeholder="e.g. Chapter summary or key insight"
              value={bookmarkNote}
              onChangeText={setBookmarkNote}
            />

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setBookmarkModalVisible(false)}
                style={{ flex: 1 }}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                title="Save"
                variant="primary"
                onPress={handleSaveBookmark}
                loading={savingBookmark}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Session Summary Modal */}
      <Modal
        visible={summaryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setSummaryModalVisible(false);
          router.back();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.summaryEmoji}>
              {sessionSummary?.qualified ? '🎉' : '📖'}
            </Text>
            <Text style={styles.modalTitle}>Session Complete</Text>
            <Text style={styles.modalSubtitle}>
              {sessionSummary?.qualified
                ? 'Great job! You achieved a qualifying 5+ minute reading session!'
                : 'Session ended. Read for at least 5 minutes to earn daily XP and streak progress.'}
            </Text>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>READING TIME</Text>
                <Text style={styles.summaryStatValue}>
                  {Math.round((sessionSummary?.active_seconds || readingSeconds) / 60)}m
                </Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>XP EARNED</Text>
                <Text style={[styles.summaryStatValue, { color: colors.gold }]}>
                  +{sessionSummary?.xp_awarded || 0}
                </Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>STREAK</Text>
                <Text style={[styles.summaryStatValue, { color: colors.accent }]}>
                  {sessionSummary?.current_streak || 0}d
                </Text>
              </View>
            </View>

            {/* Newly Unlocked Achievements */}
            {sessionSummary?.unlocked_achievements?.length > 0 && (
              <View style={styles.unlockedBox}>
                <Text style={styles.unlockedBoxTitle}>NEW ACHIEVEMENT UNLOCKED!</Text>
                {sessionSummary.unlocked_achievements.map((ach: any) => (
                  <Text key={ach.id} style={styles.unlockedAchName}>
                    {ach.icon} {ach.name}
                  </Text>
                ))}
              </View>
            )}

            <Button
              title="Return to Library"
              onPress={() => {
                setSummaryModalVisible(false);
                router.back();
              }}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: spacing.sm,
    alignItems: 'center',
  },
  headerBookTitle: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.ink,
  },
  timerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.accent,
    marginTop: 2,
  },
  bookmarkBtn: {
    padding: spacing.xs,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSecondary,
    marginTop: spacing.md,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  summaryEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.inkSecondary,
    letterSpacing: 0.5,
  },
  summaryStatValue: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink,
    marginTop: 2,
  },
  unlockedBox: {
    backgroundColor: colors.sageLight,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sage,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  unlockedBoxTitle: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.success,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  unlockedAchName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
  },
});
