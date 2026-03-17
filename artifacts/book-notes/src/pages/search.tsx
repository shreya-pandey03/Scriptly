import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useSearchAll } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/utils";
import { Input, Card } from "@/components/ui";
import { Search as SearchIcon, BookOpen, Quote as QuoteIcon } from "lucide-react";
import { useDebounce } from "use-debounce"; // We'll implement a simple debounce since we don't have the package

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Simple debounce implementation inline
  const [debouncedTerm, setDebouncedTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading } = useSearchAll(
    { q: debouncedTerm },
    { 
      request: { headers: getAuthHeaders() },
      query: { enabled: debouncedTerm.length > 2 }
    }
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-serif font-bold">Search your library</h1>
        <div className="relative max-w-xl mx-auto">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          <Input 
            autoFocus
            placeholder="Search notes, quotes, chapters..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-16 text-lg rounded-2xl shadow-lg border-primary/20 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      {isLoading && <div className="text-center text-muted-foreground animate-pulse">Searching...</div>}

      {data && !isLoading && (
        <div className="space-y-12">
          {/* Notes Results */}
          {data.notes.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-serif font-bold border-b border-border pb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Notes
              </h2>
              <div className="grid gap-4">
                {data.notes.map(note => (
                  <Link key={note.id} href={`/books/${note.bookId}`}>
                    <Card className="p-5 hover:bg-muted/50 transition-colors cursor-pointer border-transparent shadow-sm hover:shadow-md group">
                      <div className="flex items-baseline justify-between mb-2">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{note.bookTitle}</h4>
                        {note.chapter && <span className="text-xs font-semibold text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">Ch: {note.chapter}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{note.content}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Quotes Results */}
          {data.quotes.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-serif font-bold border-b border-border pb-2 flex items-center gap-2">
                <QuoteIcon className="w-5 h-5 text-accent" /> Quotes
              </h2>
              <div className="grid gap-4">
                {data.quotes.map(quote => (
                  <Link key={quote.id} href={`/books/${quote.bookId}`}>
                    <Card className="p-5 hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-accent shadow-sm hover:shadow-md group">
                      <div className="flex items-baseline justify-between mb-3">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{quote.bookTitle}</h4>
                        {quote.page && <span className="text-xs text-muted-foreground">p. {quote.page}</span>}
                      </div>
                      <p className="font-serif italic text-foreground/90 text-lg leading-relaxed">"{quote.text}"</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.notes.length === 0 && data.quotes.length === 0 && debouncedTerm.length > 2 && (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
              No results found for "{debouncedTerm}"
            </div>
          )}
        </div>
      )}
      
      {!data && debouncedTerm.length <= 2 && debouncedTerm.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Type at least 3 characters to search...
        </div>
      )}
    </div>
  );
}
