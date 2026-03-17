import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useGetBook, useGetNotes, useGetQuotes,
  useCreateNote, useUpdateNote, useDeleteNote,
  useCreateQuote, useUpdateQuote, useDeleteQuote,
  getGetNotesQueryKey, getGetQuotesQueryKey
} from "@workspace/api-client-react";
import { getAuthHeaders, BOOK_COLORS, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/use-auth";
import { useCollabStore } from "@/store/use-collab";
import { Button, Input, Textarea, Label, Dialog, Card } from "@/components/ui";
import {
  ArrowLeft, Edit3, Trash2, Plus, Quote as QuoteIcon,
  Calendar, Users, Bell, BookOpen, Wifi
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface ActivityItem {
  id: number;
  msg: string;
  ts: number;
}

export default function BookDetail() {
  const { bookId } = useParams();
  const id = parseInt(bookId || "0", 10);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const {
    editingStatus,
    startEditing,
    stopEditing,
    presenceByBook,
    joinBook,
    leaveBook,
    setNoteChangeHandler,
    setQuoteChangeHandler,
    setNoteActivityHandler,
  } = useCollabStore();

  const [activeTab, setActiveTab] = useState<"notes" | "quotes">("notes");
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [noteForm, setNoteForm] = useState({ chapter: "", chapterNumber: "", content: "" });
  const [quoteForm, setQuoteForm] = useState({ text: "", page: "", chapter: "", color: BOOK_COLORS[0] });
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const activityCounter = useRef(0);

  const presence = presenceByBook[id] ?? [];
  const othersPresent = presence.filter((p) => p.userId !== user?.id);

  // Queries
  const { data: book, isLoading: isBookLoading } = useGetBook(id, { request: { headers: getAuthHeaders() } });
  const { data: notes, isLoading: isNotesLoading } = useGetNotes(id, undefined, { request: { headers: getAuthHeaders() } });
  const { data: quotes, isLoading: isQuotesLoading } = useGetQuotes(id, undefined, { request: { headers: getAuthHeaders() } });

  // Mutations
  const createNote = useCreateNote({ request: { headers: getAuthHeaders() } });
  const updateNote = useUpdateNote({ request: { headers: getAuthHeaders() } });
  const deleteNote = useDeleteNote({ request: { headers: getAuthHeaders() } });
  const createQuote = useCreateQuote({ request: { headers: getAuthHeaders() } });
  const updateQuote = useUpdateQuote({ request: { headers: getAuthHeaders() } });
  const deleteQuote = useDeleteQuote({ request: { headers: getAuthHeaders() } });

  // Join/leave book room for presence & real-time events
  useEffect(() => {
    if (!id) return;

    joinBook(id);

    setNoteChangeHandler((bookId) => {
      if (bookId === id) {
        queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey(id) });
      }
    });

    setQuoteChangeHandler((bookId) => {
      if (bookId === id) {
        queryClient.invalidateQueries({ queryKey: getGetQuotesQueryKey(id) });
      }
    });

    setNoteActivityHandler((msg) => {
      const item: ActivityItem = { id: ++activityCounter.current, msg, ts: Date.now() };
      setActivityFeed((prev) => [item, ...prev].slice(0, 5));
      setTimeout(() => {
        setActivityFeed((prev) => prev.filter((a) => a.id !== item.id));
      }, 5000);
    });

    return () => {
      leaveBook(id);
      setNoteChangeHandler(() => {});
      setQuoteChangeHandler(() => {});
      setNoteActivityHandler(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Editing collab signals
  useEffect(() => {
    if (editingNoteId) {
      startEditing(editingNoteId);
    }
    return () => {
      if (editingNoteId) stopEditing(editingNoteId);
    };
  }, [editingNoteId, startEditing, stopEditing]);

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      chapter: noteForm.chapter || undefined,
      chapterNumber: noteForm.chapterNumber ? parseInt(noteForm.chapterNumber) : undefined,
      content: noteForm.content,
    };
    if (editingNoteId) {
      updateNote.mutate({ bookId: id, noteId: editingNoteId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey(id) });
          stopEditing(editingNoteId);
          setIsNoteOpen(false); setEditingNoteId(null);
        }
      });
    } else {
      createNote.mutate({ bookId: id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey(id) });
          setIsNoteOpen(false);
          setNoteForm({ chapter: "", chapterNumber: "", content: "" });
        }
      });
    }
  };

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      text: quoteForm.text,
      page: quoteForm.page ? parseInt(quoteForm.page) : undefined,
      chapter: quoteForm.chapter || undefined,
      color: quoteForm.color,
    };
    if (editingQuoteId) {
      updateQuote.mutate({ bookId: id, quoteId: editingQuoteId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuotesQueryKey(id) });
          setIsQuoteOpen(false); setEditingQuoteId(null);
        }
      });
    } else {
      createQuote.mutate({ bookId: id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuotesQueryKey(id) });
          setIsQuoteOpen(false);
          setQuoteForm({ text: "", page: "", chapter: "", color: BOOK_COLORS[0] });
        }
      });
    }
  };

  const handleDeleteNote = (noteId: number) => {
    if (confirm("Delete this note?")) {
      deleteNote.mutate({ bookId: id, noteId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotesQueryKey(id) })
      });
    }
  };

  const handleDeleteQuote = (quoteId: number) => {
    if (confirm("Delete this quote?")) {
      deleteQuote.mutate({ bookId: id, quoteId }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetQuotesQueryKey(id) })
      });
    }
  };

  const openEditNote = (note: any) => {
    setNoteForm({ chapter: note.chapter || "", chapterNumber: note.chapterNumber?.toString() || "", content: note.content });
    setEditingNoteId(note.id); setIsNoteOpen(true);
  };

  const openEditQuote = (quote: any) => {
    setQuoteForm({ text: quote.text, page: quote.page?.toString() || "", chapter: quote.chapter || "", color: quote.color || BOOK_COLORS[0] });
    setEditingQuoteId(quote.id); setIsQuoteOpen(true);
  };

  if (isBookLoading) return <div className="animate-pulse h-64 bg-muted rounded-2xl" />;
  if (!book) return <div>Book not found</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Back */}
      <Link href="/" className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Library
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 text-white shadow-xl" style={{ backgroundColor: book.coverColor || BOOK_COLORS[0] }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-serif font-bold leading-tight drop-shadow-md mb-4">{book.title}</h1>
          <p className="text-xl font-medium text-white/90 drop-shadow-sm mb-4">by {book.author}</p>
          {book.description && <p className="text-white/80 leading-relaxed max-w-xl mb-6">{book.description}</p>}

          {/* Presence Row */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-sm font-semibold text-white">
              <Wifi className="w-3.5 h-3.5 text-green-300" />
              <span>{presence.length} online</span>
            </div>
            <div className="flex -space-x-2">
              {presence.slice(0, 5).map((p) => (
                <div
                  key={p.userId}
                  title={p.username}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center text-xs font-bold text-white shadow-sm",
                    p.userId === user?.id ? "bg-primary/70" : "bg-white/20 backdrop-blur-sm"
                  )}
                >
                  {p.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {presence.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-black/30 border-2 border-white/30 flex items-center justify-center text-xs font-bold text-white">
                  +{presence.length - 5}
                </div>
              )}
            </div>
            {othersPresent.length > 0 && (
              <span className="text-white/70 text-xs">
                {othersPresent.map(p => p.username).join(", ")} {othersPresent.length === 1 ? "is" : "are"} also here
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed Toast */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {activityFeed.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 bg-card border border-border text-foreground text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl pointer-events-auto"
            >
              <Bell className="w-4 h-4 text-primary shrink-0" />
              {item.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex gap-6">
          <button
            className={cn("text-lg font-serif font-bold pb-4 border-b-2 transition-colors relative top-[17px]",
              activeTab === "notes" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab("notes")}
          >
            Chapter Notes
            <span className="ml-2 text-xs bg-muted text-muted-foreground py-0.5 px-2 rounded-full align-middle">{notes?.length || 0}</span>
          </button>
          <button
            className={cn("text-lg font-serif font-bold pb-4 border-b-2 transition-colors relative top-[17px]",
              activeTab === "quotes" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab("quotes")}
          >
            Quotes
            <span className="ml-2 text-xs bg-muted text-muted-foreground py-0.5 px-2 rounded-full align-middle">{quotes?.length || 0}</span>
          </button>
        </div>
        <Button
          onClick={() => {
            if (activeTab === "notes") {
              setNoteForm({ chapter: "", chapterNumber: "", content: "" });
              setEditingNoteId(null); setIsNoteOpen(true);
            } else {
              setQuoteForm({ text: "", page: "", chapter: "", color: book.coverColor || BOOK_COLORS[0] });
              setEditingQuoteId(null); setIsQuoteOpen(true);
            }
          }}
          className="shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> Add {activeTab === "notes" ? "Note" : "Quote"}
        </Button>
      </div>

      {/* Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {isNotesLoading ? (
            <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl" />)}</div>
          ) : notes?.length === 0 ? (
            <div className="text-center py-16 px-4">
              <img src={`${import.meta.env.BASE_URL}images/empty-notes.png`} alt="Empty notes" className="w-48 h-48 mx-auto mb-6 opacity-80" />
              <h3 className="text-xl font-serif font-bold mb-2">No notes yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">Read actively and capture your thoughts. Add your first chapter note.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {notes?.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0)).map((note) => {
                const isBeingEdited = editingStatus[note.id] && editingStatus[note.id] !== user?.username;
                return (
                  <Card key={note.id} className="p-6 relative group transition-all hover:shadow-md border-border/50">
                    {isBeingEdited && (
                      <div className="absolute -top-3 left-6 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                        <span className="w-2 h-2 rounded-full bg-accent-foreground animate-pulse" />
                        {editingStatus[note.id]} is editing...
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted text-muted-foreground px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          {note.chapterNumber ? `Ch ${note.chapterNumber}` : "Note"}
                        </div>
                        {note.chapter && <span className="font-serif font-bold text-foreground text-lg">{note.chapter}</span>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditNote(note)} disabled={!!isBeingEdited}
                          className="p-2 text-muted-foreground hover:text-primary bg-background rounded-lg border border-transparent hover:border-border shadow-sm transition-all disabled:opacity-40">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteNote(note.id)} disabled={!!isBeingEdited}
                          className="p-2 text-muted-foreground hover:text-destructive bg-background rounded-lg border border-transparent hover:border-border shadow-sm transition-all disabled:opacity-40">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{note.content}</p>
                    <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {format(new Date(note.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quotes Tab */}
      {activeTab === "quotes" && (
        <div className="space-y-6">
          {isQuotesLoading ? (
            <div className="grid sm:grid-cols-2 gap-6">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />)}</div>
          ) : quotes?.length === 0 ? (
            <div className="text-center py-16 px-4">
              <QuoteIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-serif font-bold mb-2">No highlights saved</h3>
              <p className="text-muted-foreground max-w-md mx-auto">Keep your favourite passages safe here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quotes?.map((quote) => (
                <Card key={quote.id} className="p-6 relative group border-l-4 overflow-hidden shadow-sm hover:shadow-md transition-all" style={{ borderLeftColor: quote.color }}>
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditQuote(quote)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteQuote(quote.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <QuoteIcon className="w-8 h-8 text-muted-foreground/20 mb-3" />
                  <p className="font-serif text-lg leading-relaxed text-foreground italic mb-6">"{quote.text}"</p>
                  <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                    {quote.page && <span>p. {quote.page}</span>}
                    {quote.page && quote.chapter && <span>•</span>}
                    {quote.chapter && <span>{quote.chapter}</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note Dialog */}
      <Dialog isOpen={isNoteOpen} onClose={() => { setIsNoteOpen(false); if (editingNoteId) stopEditing(editingNoteId); }} title={editingNoteId ? "Edit Note" : "Add Note"}>
        <form onSubmit={handleNoteSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Chapter Number</Label>
              <Input type="number" placeholder="1" value={noteForm.chapterNumber} onChange={e => setNoteForm({ ...noteForm, chapterNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Chapter Title</Label>
              <Input placeholder="e.g. Introduction" value={noteForm.chapter} onChange={e => setNoteForm({ ...noteForm, chapter: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note Content *</Label>
            <Textarea required placeholder="Write your thoughts..." className="min-h-[200px]" value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => { setIsNoteOpen(false); if (editingNoteId) stopEditing(editingNoteId); }}>Cancel</Button>
            <Button type="submit" isLoading={createNote.isPending || updateNote.isPending}>Save Note</Button>
          </div>
        </form>
      </Dialog>

      {/* Quote Dialog */}
      <Dialog isOpen={isQuoteOpen} onClose={() => setIsQuoteOpen(false)} title={editingQuoteId ? "Edit Quote" : "Add Quote"}>
        <form onSubmit={handleQuoteSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Quote Text *</Label>
            <Textarea required placeholder="Enter the exact quote..." value={quoteForm.text} onChange={e => setQuoteForm({ ...quoteForm, text: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Page Number</Label>
              <Input type="number" placeholder="42" value={quoteForm.page} onChange={e => setQuoteForm({ ...quoteForm, page: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Input placeholder="e.g. 3" value={quoteForm.chapter} onChange={e => setQuoteForm({ ...quoteForm, chapter: e.target.value })} />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Highlight Color</Label>
            <div className="flex flex-wrap gap-2">
              {BOOK_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setQuoteForm({ ...quoteForm, color })}
                  className={cn("w-8 h-8 rounded-full transition-transform ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    quoteForm.color === color ? "scale-110 ring-2 ring-foreground" : "hover:scale-105")}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsQuoteOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createQuote.isPending || updateQuote.isPending}>Save Quote</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
