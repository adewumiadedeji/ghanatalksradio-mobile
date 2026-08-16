import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { PrimaryButton } from '../../components/UI';
import { useUserStore } from '../../store/userStore';
import { getGuestToken } from '../../utils/guestToken';
import {
  fetchQuizList,
  fetchQuizDetail,
  submitQuiz,
  QuizSummaryDto,
  QuizDetailDto,
  QuizResultDto,
} from '../../services/quizApi';

export default function QuizzesScreen({ navigation }: any) {
  const user = useUserStore((s) => s.user);
  const [quizzes, setQuizzes] = useState<QuizSummaryDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<QuizDetailDto | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResultDto | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuizList()
      .then(setQuizzes)
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, []);

  const openQuiz = async (slug: string) => {
    setAnswers({});
    setResult(null);
    try {
      const detail = await fetchQuizDetail(slug);
      setActiveQuiz(detail);
    } catch (e) {
      Alert.alert("Couldn't open quiz", e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    if (Object.keys(answers).length < activeQuiz.questions.length) {
      Alert.alert('Answer every question', 'Pick an answer for each question before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const guestToken = user ? undefined : await getGuestToken();
      const scoreResult = await submitQuiz(activeQuiz.slug, answers, user?.token, guestToken);
      setResult(scoreResult);
    } catch (e) {
      Alert.alert("Couldn't submit quiz", e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (activeQuiz) {
    return (
      <SafeAreaView style={styles.flex}>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={activeQuiz.questions}
          keyExtractor={(q) => String(q.id)}
          ListHeaderComponent={
            <View style={{ gap: 4, marginBottom: SPACING.md, paddingTop: 10 }}>
              <Pressable onPress={() => setActiveQuiz(null)} style={styles.backRow}>
                <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
                <Text style={styles.backText}>All quizzes</Text>
              </Pressable>
              <Text style={styles.screenTitle}>{activeQuiz.name}</Text>
              {!!activeQuiz.description && <Text style={styles.subtitle}>{activeQuiz.description}</Text>}
              {result && (
                <View style={styles.resultBanner}>
                  <Text style={styles.resultText}>
                    You scored {result.score} / {result.total_possible}
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item: question }) => (
            <View style={styles.card}>
              <Text style={styles.questionText}>{question.question_text}</Text>
              {question.choices.map((choice) => {
                const selected = answers[question.id] === choice.id;
                return (
                  <Pressable
                    key={choice.id}
                    style={[styles.choiceRow, selected && styles.choiceRowSelected]}
                    disabled={!!result}
                    onPress={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={selected ? COLORS.secondary : COLORS.outline}
                    />
                    <Text style={styles.choiceText}>{choice.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          ListFooterComponent={
            !result ? (
              <PrimaryButton
                title="Submit Quiz"
                onPress={handleSubmit}
                loading={submitting}
                style={{ marginTop: SPACING.md }}
              />
            ) : null
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <FlatList
        data={quizzes ?? []}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 4, marginBottom: SPACING.md }}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={COLORS.secondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.screenTitle}>Quizzes</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.secondary} style={{ marginTop: SPACING.lg }} />
          ) : (
            <Text style={styles.emptyText}>No quizzes are open right now - check back soon.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openQuiz(item.slug)}>
            <Text style={styles.title}>{item.name}</Text>
            {!!item.description && <Text style={styles.subtitle}>{item.description}</Text>}
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>Ends {new Date(item.ends_at).toLocaleDateString()}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.surface },
  listContent: { padding: SPACING.md, gap: SPACING.xs },
  screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.onSurface },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  backText: { color: COLORS.secondary, fontWeight: '600', fontSize: 14 },
  card: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    gap: 6,
    marginBottom: SPACING.md,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.onSurface },
  subtitle: { fontSize: 13, color: COLORS.onSurfaceVariant },
  meta: { fontSize: 12, color: COLORS.outline },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  questionText: { fontSize: 15, fontWeight: '600', color: COLORS.onSurface, marginBottom: 6 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginTop: 6,
  },
  choiceRowSelected: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondaryContainer },
  choiceText: { fontSize: 14, color: COLORS.onSurface, flex: 1 },
  resultBanner: {
    backgroundColor: COLORS.secondaryContainer,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  resultText: { color: COLORS.onSecondaryContainer, fontWeight: '700', fontSize: 15 },
  emptyText: { color: COLORS.onSurfaceVariant, textAlign: 'center', marginTop: SPACING.lg, fontSize: 14 },
});
