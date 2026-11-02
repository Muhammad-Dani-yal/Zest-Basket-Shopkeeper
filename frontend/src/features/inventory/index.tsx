import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  Check,
  History,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Modal,
  Pill,
  ProductImage,
  QueryView,
  TopBar,
  useApp,
} from '../../components/ui';
import { api, date, money, useData, type Row } from '../../services/api';

export function Inventory() {
  const query = useData('/products'),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState('All'),
    [deleting, setDeleting] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    { mutate } = useApp(),
    nav = useNavigate();
  return (
    <>
      <TopBar
        title="Inventory"
        action={
          <Link
            className="icon-link"
            to="/inventory/history"
            aria-label="Inventory history"
          >
            <History size={20} />
          </Link>
        }
      />
      <div className="page">
        <div className="search-row">
          <div className="search">
            <Search size={17} />
            <input
              placeholder="Search products..."
              aria-label="Search products"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Clear search" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <Link className="btn" to="/inventory/add">
            <Plus size={16} /> Add Product
          </Link>
        </div>
        <div className="chips">
          {[
            'All',
            'Fruits',
            'Vegetables',
            'Dairy',
            'Bakery',
            'Grocery',
            'Others',
          ].map(c => (
            <button
              className={c === category ? 'selected' : ''}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <QueryView query={query}>
          {(products: Row[]) => {
            const rows = products.filter(
              p =>
                p.name.toLowerCase().includes(search.toLowerCase()) &&
                (category === 'All' || p.category === category),
            );
            return (
              <>
                {products.length > 0 && (
                  <div className="list-caption">
                    <span>{rows.length} products</span>
                    <span>Fresh shelves, happy homes</span>
                  </div>
                )}
                {rows.length ? (
                  rows.map(p => (
                    <Card className="product-card" key={p.id}>
                      <ProductImage product={p} />
                      <div className="product-info">
                        <h3>{p.name}</h3>
                        <small>
                          {p.category} · {money(p.pricePkr)}
                        </small>
                        <div className="stock-line">
                          <span>
                            Stock: <strong>{p.quantity}</strong>
                            {p.reserved > 0 && (
                              <small> ({p.reserved} reserved)</small>
                            )}
                          </span>
                          <Pill>
                            {!p.isAvailable
                              ? 'Unavailable'
                              : p.quantity <= p.lowStockThreshold
                              ? 'Low Stock'
                              : 'In Stock'}
                          </Pill>
                        </div>
                      </div>
                      <div className="product-tools">
                        <Link
                          aria-label={'Edit ' + p.name}
                          to={'/inventory/' + p.id + '/edit'}
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          aria-label={'Delete ' + p.name}
                          className="danger"
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Empty
                    title={
                      products.length
                        ? 'No matching products'
                        : 'No Products Found'
                    }
                    description={
                      products.length
                        ? 'Try another search or clear your filters.'
                        : 'Add your first product to get started.'
                    }
                    action={products.length ? 'Clear Filters' : 'Add Product'}
                    onClick={() =>
                      products.length
                        ? (setSearch(''), setCategory('All'))
                        : nav('/inventory/add')
                    }
                  />
                )}
              </>
            );
          }}
        </QueryView>
      </div>
      {deleting && (
        <Modal title="Delete Product?" onClose={() => setDeleting(null)}>
          <div className="delete-icon">
            <Trash2 size={24} />
          </div>
          <p className="muted center">
            Are you sure you want to delete <strong>{deleting.name}</strong>?
          </p>
          <div className="actions">
            <Button kind="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              kind="danger-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await mutate(
                    '/products/' + deleting.id,
                    undefined,
                    'DELETE',
                    'Product deleted',
                  );
                  setDeleting(null);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
const productSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  pricePkr: z.coerce.number().positive(),
  quantity: z.coerce.number().int().min(0),
  unit: z.string().min(1),
  description: z.string(),
  isAvailable: z.boolean(),
  imageUrl: z.string(),
});
export function ProductForm() {
  const { id } = useParams(),
    nav = useNavigate(),
    { mutate, notify } = useApp(),
    [uploading, setUploading] = useState(false),
    [discard, setDiscard] = useState(false);
  const query = useQuery({
    queryKey: ['/products/' + id],
    queryFn: () => api('/products/' + id),
    enabled: !!id,
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Row>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: '',
      pricePkr: '',
      quantity: '',
      unit: '',
      description: '',
      isAvailable: true,
      imageUrl: '',
    },
  });
  useEffect(() => {
    if (query.data) reset(query.data);
  }, [query.data]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
  const close = () => (isDirty ? setDiscard(true) : nav('/inventory'));
  if (id && query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const field = (name: string, label: string, type = 'text') => (
    <label className="field">
      <span>{label} *</span>
      <input
        type={type}
        step={name === 'pricePkr' ? '0.01' : '1'}
        min={name === 'quantity' ? 0 : undefined}
        placeholder={'Enter ' + label.toLowerCase()}
        {...register(name)}
      />
      {errors[name] && (
        <small className="danger">{String(errors[name]?.message)}</small>
      )}
    </label>
  );
  return (
    <>
      <TopBar
        title={id ? 'Edit Product' : 'Add Product'}
        onBack={close}
        action={
          <button aria-label="Close product form" onClick={close}>
            <X size={20} />
          </button>
        }
      />
      <div className="page">
        <form
          onSubmit={handleSubmit(async b => {
            try {
              await mutate(
                id ? '/products/' + id : '/products',
                b,
                id ? 'PATCH' : 'POST',
                id ? 'Product updated' : 'Product added',
              );
              reset(b);
              nav('/inventory');
            } catch {}
          })}
        >
          <label className="upload-tile">
            {watch('imageUrl') ? (
              <img src={watch('imageUrl')} alt="Product preview" />
            ) : (
              <>
                <Camera size={32} />
                <span>
                  {uploading ? 'Uploading...' : 'Tap to upload image'}
                </span>
                <small>PNG, JPG or WebP · up to 5 MB</small>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  notify('Image must be under 5 MB');
                  return;
                }
                setUploading(true);
                try {
                  const data = new FormData();
                  data.append('image', file);
                  const r = await api('/uploads', 'POST', data);
                  setValue('imageUrl', r.url, { shouldDirty: true });
                } catch (e: any) {
                  notify(e.message);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          {watch('imageUrl') && (
            <button
              className="text-button danger"
              type="button"
              onClick={() => setValue('imageUrl', '', { shouldDirty: true })}
            >
              Remove image
            </button>
          )}
          {field('name', 'Product Name')}
          <label className="field">
            <span>Category *</span>
            <select {...register('category')}>
              <option value="">Select category</option>
              {[
                'Fruits',
                'Vegetables',
                'Dairy',
                'Bakery',
                'Grocery',
                'Others',
              ].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            {errors.category && (
              <small className="danger">Select a category</small>
            )}
          </label>
          <div className="two-col">
            {field('pricePkr', 'Price (PKR)', 'number')}
            {field('quantity', 'Stock Quantity', 'number')}
          </div>
          <label className="field">
            <span>Unit *</span>
            <select {...register('unit')}>
              <option value="">Select unit</option>
              {['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'pack'].map(u => (
                <option key={u}>{u}</option>
              ))}
            </select>
            {errors.unit && <small className="danger">Select a unit</small>}
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              placeholder="Enter product description"
              {...register('description')}
            />
          </label>
          <label className="switch-row">
            <input type="checkbox" {...register('isAvailable')} />
            <span className="toggle" />
            <span>Available</span>
          </label>
          <Button
            kind="gradient full"
            type="submit"
            disabled={isSubmitting || uploading}
          >
            {isSubmitting
              ? 'Saving...'
              : id
              ? 'Update Product'
              : 'Save Product'}
          </Button>
        </form>
      </div>
      {discard && (
        <Modal
          title="Discard unsaved changes?"
          onClose={() => setDiscard(false)}
        >
          <p className="muted">
            Your product has changes that haven't been saved.
          </p>
          <div className="actions">
            <Button kind="outline" onClick={() => setDiscard(false)}>
              Keep Editing
            </Button>
            <Button onClick={() => nav('/inventory')}>Discard</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function InventoryHistory() {
  const [filter, setFilter] = useState('All'),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<Row | null>(null);
  const q = useData('/inventory/history?action=' + filter + '&page=' + page);
  return (
    <>
      <TopBar title="Inventory History" />
      <div className="page">
        <div className="chips">
          {['All', 'Added', 'Updated', 'Removed', 'Restocked'].map(c => (
            <button
              key={c}
              className={filter === c ? 'selected' : ''}
              onClick={() => {
                setFilter(c);
                setPage(1);
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <QueryView query={q}>
          {(data: Row) => (
            <>
              {data.items.length ? (
                data.items.map((l: Row) => (
                  <button
                    key={l.id}
                    className="history-row card"
                    onClick={() => setSelected(l)}
                  >
                    <span
                      className={
                        'round-icon ' +
                        (l.quantityChange < 0 ? 'red-bg' : 'green-bg')
                      }
                    >
                      {l.quantityChange < 0 ? (
                        <Trash2 size={18} />
                      ) : (
                        <Check size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{l.actionType}</strong>
                      <small>{l.productName}</small>
                      <small className="muted">{date(l.timestamp)}</small>
                    </div>
                    <Pill>{l.previousQuantity + ' → ' + l.newQuantity}</Pill>
                  </button>
                ))
              ) : (
                <Empty
                  title="No inventory history"
                  description="Product changes will appear here."
                  action="Refresh"
                  onClick={() => q.refetch()}
                />
              )}
              <div className="pagination">
                <Button
                  kind="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span>
                  {page} / {Math.max(1, Math.ceil(data.total / 15))}
                </span>
                <Button
                  kind="outline"
                  disabled={page * 15 >= data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </QueryView>
      </div>
      {selected && (
        <Modal title="Inventory audit record" onClose={() => setSelected(null)}>
          <p>{selected.productName}</p>
          <p>
            Physical stock: {selected.previousQuantity} → {selected.newQuantity}
          </p>
          <p className="muted">
            {date(selected.timestamp)} · {selected.actionType}
          </p>
          <small>This audit record cannot be edited.</small>
        </Modal>
      )}
    </>
  );
}
