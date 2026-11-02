import {
  Bell,
  ChevronRight,
  Eye,
  Menu,
  Package,
  Plus,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Button,
  Empty,
  OrderCard,
  Pill,
  QueryView,
  useApp,
} from '../../components/ui';
import { money, useData, type Row } from '../../services/api';

export function Dashboard() {
  const { me, setDrawer, mutate } = useApp(),
    stats = useData('/dashboard/summary'),
    orders = useData('/orders');
  return (
    <>
      <header className="dashboard-header">
        <button
          aria-label="Open navigation menu"
          onClick={() => setDrawer(true)}
        >
          <Menu size={22} />
        </button>
        <Link to="/shop/profile" className="shop-title">
          <Avatar />
          <strong>{me.shop.shopName}</strong>
          <Pill>{me.shop.verificationStatus}</Pill>
        </Link>
        <Link to="/notifications" className="bell" aria-label="Notifications">
          <Bell size={21} />
          {stats.data?.unread > 0 && <i />}
        </Link>
        <Link to="/shop/profile" aria-label="Shop profile">
          <Avatar />
        </Link>
      </header>
      <div className="dashboard-hero">
        <div className="hero-art" />
        <div className="speech">
          Bhai, aaj kaunsa
          <br />
          order tayyar karna hai?
          <br />
          <strong>Main sab dekh leta hoon!</strong>
        </div>
        <div className="hero-shortcuts">
          <Link to="/inventory">
            <Package size={26} />
            <span>Inventory</span>
          </Link>
          <Link to="/orders">
            <Eye size={26} />
            <span>Watch Orders</span>
          </Link>
        </div>
      </div>
      <div className="page dashboard-page">
        <div className="intro-line">
          <div>
            <span className="tiny-label">YOUR DAILY OVERVIEW</span>
            <h2>
              Let's make today fresh <span>✦</span>
            </h2>
          </div>
          <Pill>
            {me.shop.status === 'active'
              ? 'Open'
              : me.shop.status === 'busy'
              ? 'Busy'
              : 'Closed'}
          </Pill>
        </div>
        <QueryView query={stats}>
          {(s: Row) => (
            <div className="stats-grid">
              <Link className="stat" to="/orders?tab=New">
                <span className="stat-icon orange-bg">
                  <ShoppingBag size={19} />
                </span>
                <span>
                  New Orders<strong>{s.newOrders}</strong>
                </span>
              </Link>
              <Link className="stat" to="/orders?tab=Active">
                <span className="stat-icon purple-bg">
                  <Package size={19} />
                </span>
                <span>
                  Active Orders<strong>{s.activeOrders}</strong>
                </span>
              </Link>
              <Link className="stat" to="/reports">
                <span className="stat-icon green-bg">
                  <Wallet size={19} />
                </span>
                <span>
                  Today's Sales<strong>{money(s.todaySales)}</strong>
                </span>
              </Link>
            </div>
          )}
        </QueryView>
        <div className="section-heading">
          <h3>
            <i />
            Recent Orders
          </h3>
          <Link to="/orders">
            View All <ChevronRight size={13} />
          </Link>
        </div>
        <QueryView query={orders}>
          {(o: Row[]) =>
            o.filter(o => ['New', 'Accepted', 'Preparing'].includes(o.status))
              .length ? (
              o
                .filter(o =>
                  ['New', 'Accepted', 'Preparing'].includes(o.status),
                )
                .slice(0, 3)
                .map(o => <OrderCard key={o.id} order={o} compact />)
            ) : (
              <Empty
                title="All caught up!"
                description="New orders will appear here."
                action="Refresh"
                onClick={() => orders.refetch()}
              />
            )
          }
        </QueryView>
        <div className="tip-card">
          <span>🌱</span>
          <div>
            <strong>A little care. A happier customer.</strong>
            <p>Keep your stock fresh and your shop status up to date.</p>
          </div>
        </div>
        {me.user.id === 'demo-owner' && (
          <Button
            kind="outline full"
            onClick={() =>
              mutate('/demo/orders', {}, 'POST', 'Demo order received').catch(
                () => {},
              )
            }
          >
            <Plus size={16} /> Create Demo Order
          </Button>
        )}
      </div>
    </>
  );
}
