import { useState } from "react";
import { Link } from "wouter";
import { useGetBooks, useCreateBook, getGetBooksQueryKey } from "@workspace/api-client-react";
import { getAuthHeaders, BOOK_COLORS, cn } from "@/lib/utils";
import { Button, Input, Textarea, Label, Dialog, Card } from "@/components/ui";
import { Plus, Search, BookOpen, Quote, Library } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const createBookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  description: z.string().optional(),
  coverColor: z.string().default(BOOK_COLORS[0]),
});

type CreateBookForm = z.infer<typeof createBookSchema>;

export default function Home() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const authHeaders = getAuthHeaders();

  const { data: books, isLoading, error } = useGetBooks(
    { search: search || undefined }, 
    { request: { headers: authHeaders ? { Authorization: authHeaders.Authorization } : undefined } }
  );

  const createBookMutation = useCreateBook({
    request: { headers: authHeaders ? { Authorization: authHeaders.Authorization } : undefined }
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<CreateBookForm>({
    resolver: zodResolver(createBookSchema),
    defaultValues: { coverColor: BOOK_COLORS[0] }
  });

  const selectedColor = watch("coverColor");

  const onSubmit = (data: CreateBookForm) => {
    createBookMutation.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBooksQueryKey() });
        setIsCreateOpen(false);
        reset();
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-foreground">Your Library</h1>
          <p className="text-muted-foreground mt-2 text-lg">Organize your thoughts on the books you read.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search books..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-transparent shadow-sm"
            />
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 shadow-md shadow-primary/20">
            <Plus className="w-5 h-5 mr-1" /> Add Book
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-destructive/10 text-destructive rounded-2xl">
          Failed to load books. Please try again.
        </div>
      ) : books?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <img 
            src={`${import.meta.env.BASE_URL}images/empty-bookshelf.png`} 
            alt="Empty bookshelf" 
            className="w-64 h-64 object-contain mb-8 opacity-80"
          />
          <h3 className="text-2xl font-serif font-bold text-foreground">Your shelf is empty</h3>
          <p className="text-muted-foreground mt-2 max-w-md">Start building your digital library by adding your first book to take notes and save quotes.</p>
          <Button onClick={() => setIsCreateOpen(true)} className="mt-8 shadow-lg shadow-primary/20" size="lg">
            <Plus className="w-5 h-5 mr-2" /> Add Your First Book
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books?.map((book) => (
            <Link key={book.id} href={`/books/${book.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
              <Card className="h-full overflow-hidden border-transparent shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 bg-card">
                <div 
                  className="h-32 w-full p-6 relative flex flex-col justify-end overflow-hidden"
                  style={{ backgroundColor: book.coverColor || BOOK_COLORS[0] }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  <h3 className="relative z-10 text-xl font-serif font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                    {book.title}
                  </h3>
                  <p className="relative z-10 text-white/90 text-sm mt-1 font-medium drop-shadow-sm">{book.author}</p>
                </div>
                
                <div className="p-5 flex flex-col gap-4">
                  {book.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{book.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No description provided.</p>
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
                        <BookOpen className="w-3.5 h-3.5 text-primary" /> {book.noteCount}
                      </span>
                      <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
                        <Quote className="w-3.5 h-3.5 text-accent" /> {book.quoteCount}
                      </span>
                    </div>
                    <span>Added {format(new Date(book.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add a New Book">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Book Title</Label>
            <Input id="title" placeholder="e.g. The Name of the Rose" {...register("title")} className={errors.title ? "border-destructive" : ""} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input id="author" placeholder="e.g. Umberto Eco" {...register("author")} className={errors.author ? "border-destructive" : ""} />
            {errors.author && <p className="text-xs text-destructive">{errors.author.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short Description (Optional)</Label>
            <Textarea id="description" placeholder="What is this book about?" {...register("description")} className="min-h-[80px]" />
          </div>

          <div className="space-y-3">
            <Label>Cover Color</Label>
            <div className="flex flex-wrap gap-3">
              {BOOK_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("coverColor", color)}
                  className={cn(
                    "w-10 h-10 rounded-full transition-transform ring-offset-2 ring-offset-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedColor === color ? "scale-110 ring-2 ring-foreground" : "hover:scale-105 shadow-sm"
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createBookMutation.isPending}>Add Book</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
