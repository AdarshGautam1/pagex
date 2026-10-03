import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../services/api';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import {
  checkOfflineAvailability,
  downloadPdfForOffline,
} from '../../../services/downloadManager';
import {
  getReadingPosition,
  saveReadingPosition,
  ContentType,
} from '../../../services/sqlite';
import { colors, fonts, radius, spacing } from '../../../constants/theme';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ id: string; type?: string; title?: string }>();
  const id = params.id;
  const contentType: ContentType = (params.type === 'note' ? 'note' : 'book') as ContentType;
  const passedTitle = params.title;

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pdfSourceUrl, setPdfSourceUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState(passedTitle || (contentType === 'note' ? 'Study Note' : 'Reading Book'));
  const [loading, setLoading] = useState(true);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Resume page states
  const [initialPage, setInitialPage] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
  const currentPageRef = useRef<number>(1);
  const debounceTimerRef = useRef<any>(null);

  sessionIdRef.current = sessionId;
  currentPageRef.current = currentPage;

  // Persist reading position with debounce
  const recordPageChange = useCallback((pageNum: number) => {
    if (!id || pageNum < 1) return;
    setCurrentPage(pageNum);
    setPageNumberInput(String(pageNum));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveReadingPosition(id, contentType, pageNum).catch(() => {});
    }, 400);
  }, [id, contentType]);

  // AppState listener to save page position when app backgrounds
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (id && currentPageRef.current > 0) {
          saveReadingPosition(id, contentType, currentPageRef.current).catch(() => {});
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [id, contentType]);

  // Main initialization: Offline check -> Resume page check -> Network fetch
  useEffect(() => {
    let isMounted = true;

    async function initReader() {
      if (!id) return;
      try {
        setLoading(true);

        // 1. Check SQLite for last reading position
        const savedPage = await getReadingPosition(id, contentType);
        if (isMounted) {
          setInitialPage(savedPage);
          setCurrentPage(savedPage);
          setPageNumberInput(String(savedPage));
        }

        // 2. Check offline availability on device
        const offlineCheck = await checkOfflineAvailability(id, contentType);

        if (offlineCheck.isAvailable && offlineCheck.localPath) {
          // OFFLINE FILE AVAILABLE
          if (isMounted) setIsOfflineMode(true);

          try {
            // Read as base64 for reliable universal rendering inside PDF.js on all platforms
            const base64Data = await FileSystem.readAsStringAsync(offlineCheck.localPath, {
              encoding: 'base64',
            });
            if (isMounted) {
              setPdfBase64(base64Data);
              setPdfSourceUrl(offlineCheck.localPath);
            }
          } catch (readErr) {
            console.warn('Could not read local file as base64, falling back to uri:', readErr);
            if (isMounted) setPdfSourceUrl(offlineCheck.localPath);
          }

          // If online and it's an official book, try to record gamified session silently in background
          if (contentType === 'book') {
            api.startReading(id)
              .then((res) => {
                if (!isMounted) return;
                setSessionId(res.session_id);
                if (res.book_title) setBookTitle(res.book_title);
                startHeartbeats();
              })
              .catch(() => {
                // Completely safe to ignore when offline!
              });
          }
        } else {
          // ONLINE STREAMING FLOW
          if (contentType === 'note') {
            const noteDetail = await api.getCommunityNoteDetail(id);
            if (!isMounted) return;
            setPdfSourceUrl(noteDetail.pdf_url);
            if (noteDetail.note?.title) setBookTitle(noteDetail.note.title);
          } else {
            const res = await api.startReading(id);
            if (!isMounted) return;
            setSessionId(res.session_id);
            setPdfSourceUrl(res.pdf_url);
            if (res.book_title) setBookTitle(res.book_title);
            startHeartbeats();
          }
        }

        // Local reading time counter
        timerIntervalRef.current = setInterval(() => {
          setReadingSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err: any) {
        if (!isMounted) return;
        Alert.alert(
          'Unable to Open Document',
          err.message || 'Could not load PDF document. Please check your connection or try again.'
        );
        router.back();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    function startHeartbeats() {
      heartbeatIntervalRef.current = setInterval(() => {
        if (sessionIdRef.current) {
          api.heartbeatReading(sessionIdRef.current).catch((err) => {
            console.warn('Heartbeat error:', err);
          });
        }
      }, 30000);
    }

    initReader();

    // Cleanup & final position save on unmount
    return () => {
      isMounted = false;
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      if (id && currentPageRef.current > 0) {
        saveReadingPosition(id, contentType, currentPageRef.current).catch(() => {});
      }

      if (sessionIdRef.current) {
        api.endReading(sessionIdRef.current).catch(() => {});
      }
    };
  }, [id, contentType]);

  // Handle User-Initiated Exit
  const handleExitReader = async () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    // Save final page position immediately
    if (id && currentPageRef.current > 0) {
      await saveReadingPosition(id, contentType, currentPageRef.current).catch(() => {});
    }

    if (sessionId) {
      try {
        setLoading(true);
        const summary = await api.endReading(sessionId);
        setSessionSummary(summary);
        sessionIdRef.current = null; // Prevent duplicate end on unmount
        setSummaryModalVisible(true);
      } catch {
        router.back();
      } finally {
        setLoading(false);
      }
    } else {
      router.back();
    }
  };

  const handleSaveBookmark = async () => {
    if (!id || contentType !== 'book') {
      // If note, save local position
      const pageNum = parseInt(pageNumberInput, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        await saveReadingPosition(id, contentType, pageNum);
        setBookmarkModalVisible(false);
        Alert.alert('Position Saved', `Reading position marked at Page ${pageNum}.`);
      }
      return;
    }

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
      await saveReadingPosition(id, contentType, pageNum);
      setBookmarkModalVisible(false);
      Alert.alert('Bookmark Saved', `Page ${pageNum} bookmarked successfully.`);
      setBookmarkNote('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save bookmark.');
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleWebMessage = (event: any) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload.type === 'PAGE_CHANGED' && typeof payload.page === 'number') {
        recordPageChange(payload.page);
      }
    } catch {
      // Non-json message
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getPdfHtml = () => {
    const resumePage = initialPage || 1;

    // Use base64 data if available (100% offline), else remote URL
    const pdfSourceParam = pdfBase64
      ? `data:application/pdf;base64,${pdfBase64}`
      : pdfSourceUrl || '';

    return `
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
            padding: 16px 12px 80px 12px;
            gap: 18px;
          }
          .page-card {
            background-color: #FFFFFF;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            border-radius: 4px;
            overflow: hidden;
            width: 100%;
            max-width: 760px;
            position: relative;
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
          #resume-toast {
            display: none;
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #7A3030;
            color: #FFFFFF;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            z-index: 100;
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
        </style>
      </head>
      <body>
        <div id="status-box">
          <div class="spinner"></div>
          <div class="status-title">Loading PDF Reader...</div>
          <div class="status-sub">Preparing digital pages</div>
        </div>

        <div id="resume-toast">Resumed from Page ${resumePage}</div>

        <div id="error-box">
          <div class="error-msg" id="error-text">Unable to render PDF document.</div>
        </div>

        <div id="viewer-container"></div>

        <script>
          const pdfDataUrl = ${JSON.stringify(pdfSourceParam)};
          const initialResumePage = ${resumePage};

          if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }

          function notifyPageChange(pageNum) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAGE_CHANGED',
                page: pageNum
              }));
            }
          }

          async function startRender() {
            try {
              let loadingTask;
              if (pdfDataUrl.startsWith('data:application/pdf;base64,')) {
                // Convert base64 to Uint8Array for offline PDF.js rendering
                const rawBase64 = pdfDataUrl.replace('data:application/pdf;base64,', '');
                const binaryStr = atob(rawBase64);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                  bytes[i] = binaryStr.charCodeAt(i);
                }
                loadingTask = pdfjsLib.getDocument({ data: bytes });
              } else {
                loadingTask = pdfjsLib.getDocument({
                  url: pdfDataUrl,
                  cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                  cMapPacked: true,
                });
              }

              const pdf = await loadingTask.promise;
              document.getElementById('status-box').style.display = 'none';
              const container = document.getElementById('viewer-container');

              // Intersection observer to track current visible page
              const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
                    const pNum = parseInt(entry.target.getAttribute('data-page'), 10);
                    if (pNum) {
                      notifyPageChange(pNum);
                    }
                  }
                });
              }, { threshold: [0.4, 0.7] });

              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 });

                const card = document.createElement('div');
                card.className = 'page-card';
                card.id = 'page-card-' + pageNum;
                card.setAttribute('data-page', pageNum);

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

                observer.observe(card);
              }

              // Auto-resume to last reading page
              if (initialResumePage > 1) {
                setTimeout(() => {
                  const targetCard = document.getElementById('page-card-' + initialResumePage);
                  if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    const toast = document.getElementById('resume-toast');
                    if (toast) {
                      toast.style.display = 'block';
                      setTimeout(() => { toast.style.display = 'none'; }, 2500);
                    }
                  }
                }, 300);
              }
            } catch (err) {
              console.error('PDF render error:', err);
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
          <Text style={styles.headerBookTitle} numberOfLines={1}>
            {bookTitle}
          </Text>
          <View style={styles.subHeaderRow}>
            {isOfflineMode && (
              <View style={styles.offlinePill}>
                <Ionicons name="cloud-offline" size={11} color={colors.success} />
                <Text style={styles.offlinePillText}>Offline</Text>
              </View>
            )}
            <Text style={styles.pageIndicatorText}>
              Page {currentPage}
            </Text>
            {contentType === 'book' && (
              <Text style={styles.timerText}>
                · ⏱ {formatTimer(readingSeconds)} {readingSeconds >= 300 ? '🔥 Qualified' : ''}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            setPageNumberInput(String(currentPage));
            setBookmarkModalVisible(true);
          }}
          style={styles.bookmarkBtn}
        >
          <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Reader Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>
            {isOfflineMode ? 'Loading local cached PDF...' : 'Loading protected PDF securely...'}
          </Text>
        </View>
      ) : pdfSourceUrl || pdfBase64 ? (
        <WebView
          source={{ html: getPdfHtml() }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowingReadAccessToURL="*"
          scalesPageToFit={Platform.OS === 'android'}
          startInLoadingState={false}
          onMessage={handleWebMessage}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>Unable to load digital edition.</Text>
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.md }}
          />
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
            <Text style={styles.modalTitle}>Save Reading Place</Text>
            <Text style={styles.modalSubtitle}>
              Bookmark current page position for quick resume.
            </Text>

            <Input
              label="PAGE NUMBER"
              keyboardType="number-pad"
              value={pageNumberInput}
              onChangeText={setPageNumberInput}
            />

            {contentType === 'book' && (
              <Input
                label="NOTE (OPTIONAL)"
                placeholder="e.g. Chapter summary or key insight"
                value={bookmarkNote}
                onChangeText={setBookmarkNote}
              />
            )}

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setBookmarkModalVisible(false)}
                style={{ flex: 1 }}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                title="Save Place"
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
              title="Return"
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
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8ECE6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    gap: 3,
  },
  offlinePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.success,
  },
  pageIndicatorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.inkSecondary,
  },
  timerText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.accent,
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
    backgroundColor: '#1F1B18',
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.error,
    marginTop: spacing.sm,
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
