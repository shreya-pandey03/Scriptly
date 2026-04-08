import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useSearchAll } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/utils";
import { Input, Card } from "@/components/ui";
import {
  Search as SearchIcon,
  BookOpen,
  Quote as QuoteIcon,
} from "lucide-react";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  // ✅ Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const enabled = debouncedTerm.length > 2;

  // ✅ ALWAYS safe headers (fixes TS error)
  const authHeaders = getAuthHeaders();
  const headers = authHeaders?.Authorization ? authHeaders : undefined;

  // ✅ API Call (CORRECT STRUCTURE)
  const { data, isLoading } = useSearchAll(
    { q: debouncedTerm },
    {
      request: {
        headers,
      },
      query: {
        enabled,
        staleTime: 1000 * 30,
        queryKey: []
      },
    }
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-serif font-bold">
          Search your library
        </h1>

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

      {/* Loading */}
      {isLoading && enabled && (
        <div className="text-center text-muted-foreground animate-pulse">
          Searching...
        </div>
      )}

      {/* Results */}
      {enabled && data && !isLoading && (
        <div className="space-y-12">
          {/* NOTES */}
          {data.notes?.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-serif font-bold border-b pb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Notes
              </h2>

              <div className="grid gap-4">
                {data.notes.map((note) => (
                  <Link key={note.id} href={`/books/${note.bookId}`}>
                    <Card className="p-5 hover:bg-muted/50 cursor-pointer shadow-sm hover:shadow-md group transition-all">
                      <div className="flex justify-between mb-2">
                        <h4 className="font-bold group-hover:text-primary transition-colors">
                          {note.bookTitle}
                        </h4>

                        {note.chapter && (
                          <span className="text-xs bg-background px-2 py-1 rounded-md border">
                            Ch: {note.chapter}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {note.content}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* QUOTES */}
          {data.quotes?.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-serif font-bold border-b pb-2 flex items-center gap-2">
                <QuoteIcon className="w-5 h-5 text-accent" />
                Quotes
              </h2>

              <div className="grid gap-4">
                {data.quotes.map((quote) => (
                  <Link key={quote.id} href={`/books/${quote.bookId}`}>
                    <Card className="p-5 hover:bg-muted/50 cursor-pointer border-l-4 border-l-accent shadow-sm hover:shadow-md group transition-all">
                      <div className="flex justify-between mb-3">
                        <h4 className="font-bold group-hover:text-primary transition-colors">
                          {quote.bookTitle}
                        </h4>

                        {quote.page && (
                          <span className="text-xs text-muted-foreground">
                            p. {quote.page}
                          </span>
                        )}
                      </div>

                      <p className="italic text-lg text-foreground">
                        "{quote.text}"
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* EMPTY STATE */}
          {data.notes?.length === 0 &&
            data.quotes?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-2xl">
                No results found for "{debouncedTerm}"
              </div>
            )}
        </div>
      )}

      {/* MIN LENGTH HINT */}
      {!enabled && searchTerm.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Type at least 3 characters...
        </div>
      )}
    </div>
  );
}