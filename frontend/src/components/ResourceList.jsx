import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { api } from "../services/api";
import { Avatar, Badge, Button, Card, Input, Spinner } from "./ui";
import { cn } from "../lib/utils";

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
      <Icon size={44} strokeWidth={1.2} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

export function ResourceList({
  endpoint,
  title,
  emptyLabel,
  emptyIcon: EmptyIcon,
  columns,
  onNew,
  onEdit,
  searchable = true,
  newLabel = "Novo",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(
    async (currentPage = 1, currentSearch = search) => {
      setLoading(true);
      setError("");
      try {
        const params = { page: currentPage, pageSize: 15 };
        if (currentSearch.trim()) params.search = currentSearch.trim();
        const { data } = await api.get(endpoint, { params });
        setItems(data.data);
        setTotalPages(data.pagination.totalPages);
        setPage(currentPage);
      } catch {
        setError("Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, search],
  );

  useEffect(() => {
    load(1, "");
  }, [endpoint]);

  useEffect(() => {
    const timer = setTimeout(() => load(1, search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleDelete(id) {
    if (!window.confirm("Deseja remover este registro?")) return;
    setDeleting(id);
    try {
      await api.delete(`${endpoint}/${id}`);
      load(page, search);
    } catch {
      alert("Não foi possível remover o registro.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie os registros desta seção.
          </p>
        </div>
        {onNew && (
          <Button onClick={onNew} size="md">
            <Plus size={16} />
            {newLabel}
          </Button>
        )}
      </div>

      <Card>
        {searchable && (
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar…"
                className="h-10 w-full rounded-xl border border-input bg-muted pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/15"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={EmptyIcon} label={emptyLabel} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                          col.className,
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition hover:bg-muted/40"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn("px-5 py-3.5 align-middle", col.className)}
                        >
                          {col.render ? col.render(item) : (item[col.key] ?? "—")}
                        </td>
                      ))}
                      <td className="px-5 py-3.5 text-right align-middle">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(item)}
                            >
                              Editar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                            onClick={() => handleDelete(item.id)}
                            disabled={deleting === item.id}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={(p) => load(p, search)} />
          </>
        )}
      </Card>
    </div>
  );
}
