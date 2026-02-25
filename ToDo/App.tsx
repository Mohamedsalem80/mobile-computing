import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

type Priority = 'high' | 'medium' | 'low';

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
};

type Filter = 'all' | 'active' | 'completed';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#FF6B6B',
  medium: '#FFB347',
  low: '#6BCB77',
};

// ─── Animated todo row ──────────────────────────────────────────────────────

type TodoItemProps = {
  item: Todo;
  theme: typeof light;
  onToggle: () => void;
  onDelete: () => void;
  editingId: string | null;
  editText: string;
  setEditText: (t: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
};

function AnimatedTodoItem({
  item,
  theme,
  onToggle,
  onDelete,
  editingId,
  editText,
  setEditText,
  onStartEdit,
  onSaveEdit,
}: TodoItemProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [anim]);

  const isEditing = editingId === item.id;

  return (
    <Animated.View
      style={[
        styles.todoItem,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderLeftColor: PRIORITY_COLORS[item.priority],
          borderLeftWidth: 4,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}>
      {/* Checkbox */}
      <Pressable onPress={onToggle} style={styles.checkArea}>
        <View
          style={[
            styles.checkbox,
            { borderColor: item.completed ? '#6C63FF' : theme.subtle },
            item.completed && styles.checkboxDone,
          ]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      {/* Text / Edit area */}
      <View style={styles.todoMiddle}>
        {isEditing ? (
          <TextInput
            style={[
              styles.todoText,
              styles.editInput,
              { color: theme.text, borderBottomColor: '#6C63FF' },
            ]}
            value={editText}
            onChangeText={setEditText}
            onSubmitEditing={onSaveEdit}
            onBlur={onSaveEdit}
            autoFocus
            returnKeyType="done"
          />
        ) : (
          <Pressable onLongPress={onStartEdit} onPress={onToggle}>
            <Text
              style={[
                styles.todoText,
                { color: theme.text },
                item.completed && {
                  color: theme.subtle,
                  textDecorationLine: 'line-through',
                },
              ]}
              numberOfLines={2}>
              {item.text}
            </Text>
          </Pressable>
        )}
        <Text
          style={[styles.priorityBadge, { color: PRIORITY_COLORS[item.priority] }]}>
          {item.priority.toUpperCase()}
        </Text>
      </View>

      {/* Delete */}
      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <TodoApp />
    </SafeAreaProvider>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

function TodoApp() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';

  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [priority, setPriority] = useState<Priority>('medium');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const theme = isDarkMode ? dark : light;

  // ── Actions ───────────────────────────────────────────────────────────────

  const addTodo = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setTodos(prev => [
      {
        id: Date.now().toString(),
        text,
        completed: false,
        priority,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setInput('');
    Keyboard.dismiss();
  }, [input, priority]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearCompleted = () => {
    Alert.alert('Clear completed', 'Remove all completed tasks?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => setTodos(prev => prev.filter(t => !t.completed)),
      },
    ]);
  };

  const startEdit = useCallback((todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingId) {
      const text = editText.trim();
      if (text) {
        setTodos(prev =>
          prev.map(t => (t.id === editingId ? { ...t, text } : t)),
        );
      }
      setEditingId(null);
    }
  }, [editingId, editText]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const filtered = todos.filter(t => {
    const matchesFilter =
      filter === 'active'
        ? !t.completed
        : filter === 'completed'
        ? t.completed
        : true;
    const matchesSearch =
      search === '' || t.text.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const remaining = todos.filter(t => !t.completed).length;
  const completionPct =
    todos.length > 0 ? (todos.length - remaining) / todos.length : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View
        style={[
          styles.flex,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}>

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
          <Text style={styles.headerTitle}>MY TODOS</Text>
          <Text style={styles.headerSub}>
            {todos.length - remaining} of {todos.length} completed
          </Text>
        </View>

        {/* ── Progress bar ── */}
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(completionPct * 100)}%` },
            ]}
          />
        </View>

        {/* ── Input row ── */}
        <View
          style={[
            styles.inputRow,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Add a new task…"
            placeholderTextColor={theme.placeholder}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addTodo}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={addTodo}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        {/* ── Priority selector ── */}
        <View
          style={[
            styles.priorityRow,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}>
          <Text style={[styles.priorityLabel, { color: theme.subtle }]}>
            Priority:
          </Text>
          {(['low', 'medium', 'high'] as Priority[]).map(p => (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.priorityBtn,
                { borderColor: PRIORITY_COLORS[p] },
                priority === p && { backgroundColor: PRIORITY_COLORS[p] },
              ]}>
              <Text
                style={[
                  styles.priorityBtnText,
                  {
                    color:
                      priority === p ? '#FFF' : PRIORITY_COLORS[p],
                  },
                ]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Search bar ── */}
        <View
          style={[
            styles.searchRow,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}>
          <Text style={[styles.searchIcon, { color: theme.subtle }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search tasks…"
            placeholderTextColor={theme.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text
                style={{
                  color: theme.subtle,
                  fontSize: 16,
                  paddingHorizontal: 8,
                }}>
                ✕
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Filter tabs ── */}
        <View
          style={[
            styles.filterRow,
            { backgroundColor: theme.card, borderBottomColor: theme.border },
          ]}>
          {(['all', 'active', 'completed'] as Filter[]).map(f => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={styles.filterBtn}>
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f ? '#6C63FF' : theme.subtle },
                  filter === f && styles.filterActive,
                ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Todo list ── */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.subtle }]}>
              {search
                ? 'No matching tasks.'
                : filter === 'completed'
                ? 'No completed tasks yet.'
                : filter === 'active'
                ? 'Nothing left to do!'
                : 'Add your first task above.'}
            </Text>
          }
          renderItem={({ item }) => (
            <AnimatedTodoItem
              item={item}
              theme={theme}
              onToggle={() => toggleTodo(item.id)}
              onDelete={() => deleteTodo(item.id)}
              editingId={editingId}
              editText={editText}
              setEditText={setEditText}
              onStartEdit={() => startEdit(item)}
              onSaveEdit={saveEdit}
            />
          )}
        />

        {/* ── Footer ── */}
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.card, borderTopColor: theme.border },
          ]}>
          <Text style={[styles.footerText, { color: theme.subtle }]}>
            {remaining} item{remaining !== 1 ? 's' : ''} left
          </Text>
          {todos.some(t => t.completed) && (
            <Pressable onPress={clearCompleted}>
              <Text style={[styles.footerText, { color: '#FF6B6B' }]}>
                Clear completed
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Themes ─────────────────────────────────────────────────────────────────

const light = {
  bg: '#F0F0F5',
  card: '#FFFFFF',
  text: '#1A1A2E',
  subtle: '#9A9AB0',
  placeholder: '#BBBBD0',
  border: '#E8E8F0',
  headerBg: '#6C63FF',
};

const dark = {
  bg: '#12121A',
  card: '#1E1E2E',
  text: '#E8E8FF',
  subtle: '#6060A0',
  placeholder: '#404060',
  border: '#2A2A3E',
  headerBg: '#4A44CC',
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    letterSpacing: 1,
  },

  // Progress bar
  progressTrack: {
    height: 4,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#6BCB77',
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addBtn: {
    backgroundColor: '#6C63FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '300',
  },

  // Priority row
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  priorityLabel: {
    fontSize: 13,
    marginRight: 4,
  },
  priorityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterActive: {
    fontWeight: '700',
  },

  // List
  list: {
    padding: 16,
    gap: 10,
  },

  // Todo item
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkArea: {
    padding: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  todoMiddle: {
    flex: 1,
    marginHorizontal: 12,
  },
  todoText: {
    fontSize: 15,
  },
  editInput: {
    borderBottomWidth: 1.5,
    paddingVertical: 2,
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  empty: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 13,
  },
});

export default App;
